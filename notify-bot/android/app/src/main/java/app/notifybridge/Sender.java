package app.notifybridge;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Sends notifications to the server. Each one is first written to a queue file, so nothing is
 * lost while the phone is offline; the queue is sent as one batch whenever a send succeeds.
 */
public final class Sender {
    static final String PREFS = "settings";
    static final String URL_KEY = "url";
    static final String TOKEN_KEY = "token";
    static final String EXCLUDED_KEY = "excluded";
    static final String ONGOING_KEY = "ongoing";
    static final String STATUS_KEY = "status";

    private static final int MAX_QUEUED = 2000;
    private static final int BATCH = 200;
    private static final ExecutorService WORKER = Executors.newSingleThreadExecutor();

    private Sender() {}

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    /** Queues one notification and tries to send everything waiting. */
    public static void enqueue(Context context, JSONObject item) {
        final Context c = context.getApplicationContext();
        WORKER.execute(() -> {
            try {
                List<String> lines = read(c);
                lines.add(item.toString());
                while (lines.size() > MAX_QUEUED) lines.remove(0);
                write(c, lines);
            } catch (Exception e) {
                status(c, "Couldn't queue: " + e.getMessage());
            }
            flushNow(c);
        });
    }

    /** Sends what's waiting (after the settings change, or from the test button). */
    public static void flush(Context context) {
        final Context c = context.getApplicationContext();
        WORKER.execute(() -> flushNow(c));
    }

    private static synchronized void flushNow(Context c) {
        SharedPreferences p = prefs(c);
        String url = p.getString(URL_KEY, "").trim();
        String token = p.getString(TOKEN_KEY, "").trim();
        if (url.isEmpty() || token.isEmpty()) {
            status(c, "Set the server address and token.");
            return;
        }
        try {
            List<String> lines = read(c);
            while (!lines.isEmpty()) {
                int n = Math.min(BATCH, lines.size());
                JSONArray items = new JSONArray();
                for (int i = 0; i < n; i++) items.put(new JSONObject(lines.get(i)));
                int code = post(url, token, new JSONObject().put("items", items).toString());
                if (code == 401) {
                    status(c, "The server refused the token (401).");
                    return;
                }
                if (code < 200 || code >= 300) {
                    status(c, "The server answered " + code + "; " + lines.size() + " waiting.");
                    return;
                }
                lines = new ArrayList<>(lines.subList(n, lines.size()));
                write(c, lines);
            }
            status(c, "Sent at " + java.text.DateFormat.getTimeInstance().format(new java.util.Date()));
        } catch (Exception e) {
            int waiting = 0;
            try {
                waiting = read(c).size();
            } catch (Exception ignored) {
                // The count is only for the status line.
            }
            status(c, "Couldn't reach the server (" + e.getClass().getSimpleName() + "); " + waiting + " waiting.");
        }
    }

    private static int post(String url, String token, String body) throws Exception {
        String endpoint = url.replaceAll("/+$", "");
        if (!endpoint.endsWith("/api/notifications")) endpoint += "/api/notifications";
        HttpURLConnection conn = (HttpURLConnection) new URL(endpoint).openConnection();
        try {
            conn.setConnectTimeout(15000);
            conn.setReadTimeout(30000);
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            conn.setRequestProperty("Authorization", "Bearer " + token);
            try (OutputStream out = conn.getOutputStream()) {
                out.write(body.getBytes(StandardCharsets.UTF_8));
            }
            return conn.getResponseCode();
        } finally {
            conn.disconnect();
        }
    }

    private static File queue(Context c) {
        return new File(c.getFilesDir(), "queue.jsonl");
    }

    private static List<String> read(Context c) throws Exception {
        List<String> lines = new ArrayList<>();
        File f = queue(c);
        if (!f.exists()) return lines;
        try (BufferedReader r = new BufferedReader(new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8))) {
            String line;
            while ((line = r.readLine()) != null) if (!line.trim().isEmpty()) lines.add(line);
        }
        return lines;
    }

    private static void write(Context c, List<String> lines) throws Exception {
        File tmp = new File(c.getFilesDir(), "queue.jsonl.tmp");
        try (FileOutputStream out = new FileOutputStream(tmp)) {
            for (String l : lines) out.write((l + "\n").getBytes(StandardCharsets.UTF_8));
        }
        if (!tmp.renameTo(queue(c))) throw new Exception("couldn't replace the queue file");
    }

    static void status(Context c, String text) {
        prefs(c).edit().putString(STATUS_KEY, text).apply();
    }
}
