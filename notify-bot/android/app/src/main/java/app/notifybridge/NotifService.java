package app.notifybridge;

import android.app.Notification;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;

import org.json.JSONObject;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/** Android hands every posted notification to this service once access is granted in Settings. */
public class NotifService extends NotificationListenerService {

    @Override
    public void onListenerConnected() {
        Sender.status(this, "Listening for notifications.");
        Sender.flush(this);
    }

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        try {
            JSONObject item = describe(sbn);
            if (item != null) Sender.enqueue(this, item);
        } catch (Exception e) {
            Sender.status(this, "Couldn't read a notification: " + e.getMessage());
        }
    }

    private JSONObject describe(StatusBarNotification sbn) throws Exception {
        String pkg = sbn.getPackageName();
        if (pkg.equals(getPackageName())) return null;
        SharedPreferences p = Sender.prefs(this);
        if (excluded(p).contains(pkg.toLowerCase(Locale.ROOT))) return null;

        Notification n = sbn.getNotification();
        // A group's summary repeats its children; an ongoing one (music, downloads) keeps updating.
        if ((n.flags & Notification.FLAG_GROUP_SUMMARY) != 0) return null;
        if (!p.getBoolean(Sender.ONGOING_KEY, false) && (n.flags & Notification.FLAG_ONGOING_EVENT) != 0) return null;

        Bundle x = n.extras;
        String title = text(x, Notification.EXTRA_TITLE_BIG);
        if (title.isEmpty()) title = text(x, Notification.EXTRA_TITLE);
        String body = text(x, Notification.EXTRA_BIG_TEXT);
        if (body.isEmpty()) body = text(x, Notification.EXTRA_TEXT);
        CharSequence[] lines = x.getCharSequenceArray(Notification.EXTRA_TEXT_LINES);
        if (body.isEmpty() && lines != null) {
            StringBuilder b = new StringBuilder();
            for (CharSequence l : lines) if (l != null) b.append(b.length() > 0 ? "\n" : "").append(l);
            body = b.toString();
        }
        if (title.isEmpty() && body.isEmpty()) return null;

        return new JSONObject()
                .put("device", Build.MANUFACTURER + " " + Build.MODEL)
                .put("package", pkg)
                .put("app", label(pkg))
                .put("title", title)
                .put("text", body)
                .put("subText", text(x, Notification.EXTRA_SUB_TEXT))
                .put("category", n.category == null ? "" : n.category)
                .put("key", sbn.getKey())
                .put("postedAt", sbn.getPostTime());
    }

    private static String text(Bundle x, String key) {
        CharSequence s = x.getCharSequence(key);
        return s == null ? "" : s.toString().trim();
    }

    private String label(String pkg) {
        try {
            PackageManager pm = getPackageManager();
            ApplicationInfo info = pm.getApplicationInfo(pkg, 0);
            return pm.getApplicationLabel(info).toString();
        } catch (PackageManager.NameNotFoundException e) {
            return pkg;
        }
    }

    static Set<String> excluded(SharedPreferences p) {
        Set<String> out = new HashSet<>();
        for (String s : p.getString(Sender.EXCLUDED_KEY, "").split("[,\\s]+")) {
            if (!s.trim().isEmpty()) out.add(s.trim().toLowerCase(Locale.ROOT));
        }
        return out;
    }
}
