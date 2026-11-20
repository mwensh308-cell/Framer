package app.notifybridge;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.text.InputType;
import android.view.View;
import android.widget.Button;
import android.widget.CheckBox;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

import org.json.JSONObject;

/** One screen: the server address and token, apps to leave out, and notification access. */
public class MainActivity extends Activity {
    private EditText url;
    private EditText token;
    private EditText excluded;
    private CheckBox ongoing;
    private TextView access;
    private TextView status;

    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        SharedPreferences p = Sender.prefs(this);
        int pad = (int) (16 * getResources().getDisplayMetrics().density);

        LinearLayout col = new LinearLayout(this);
        col.setOrientation(LinearLayout.VERTICAL);
        col.setPadding(pad, pad, pad, pad);
        col.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);

        access = label(col, "", 18);
        Button grant = button(col, "منح إذن قراءة الإشعارات");
        grant.setOnClickListener(v -> startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));

        label(col, "عنوان الخادم (مثال: https://example.com أو http://192.168.1.10:8787)", 14);
        url = field(col, p.getString(Sender.URL_KEY, ""), InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_URI);
        label(col, "الرمز السري (DEVICE_TOKEN)", 14);
        token = field(col, p.getString(Sender.TOKEN_KEY, ""), InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_VARIATION_PASSWORD);
        label(col, "تطبيقات لا تُرسل (أسماء الحزم، مفصولة بفواصل)", 14);
        excluded = field(col, p.getString(Sender.EXCLUDED_KEY, ""), InputType.TYPE_CLASS_TEXT);
        ongoing = new CheckBox(this);
        ongoing.setText("أرسل الإشعارات الدائمة أيضًا (موسيقى، تنزيلات…)");
        ongoing.setChecked(p.getBoolean(Sender.ONGOING_KEY, false));
        col.addView(ongoing);

        button(col, "حفظ").setOnClickListener(v -> {
            p.edit()
                    .putString(Sender.URL_KEY, url.getText().toString().trim())
                    .putString(Sender.TOKEN_KEY, token.getText().toString().trim())
                    .putString(Sender.EXCLUDED_KEY, excluded.getText().toString().trim())
                    .putBoolean(Sender.ONGOING_KEY, ongoing.isChecked())
                    .apply();
            Sender.status(this, "Saved.");
            Sender.flush(this);
            refresh();
        });
        button(col, "إرسال إشعار تجريبي").setOnClickListener(v -> {
            try {
                Sender.enqueue(this, new JSONObject()
                        .put("device", Build.MANUFACTURER + " " + Build.MODEL)
                        .put("package", getPackageName())
                        .put("app", "جسر الإشعارات")
                        .put("title", "تجربة")
                        .put("text", "إذا وصلتك هذه الرسالة في تيليجرام فالربط يعمل ✅")
                        .put("key", "test-" + System.currentTimeMillis())
                        .put("postedAt", System.currentTimeMillis()));
                Sender.status(this, "Sending a test…");
            } catch (Exception e) {
                Sender.status(this, e.getMessage());
            }
            v.postDelayed(this::refresh, 2500);
        });
        status = label(col, "", 14);

        ScrollView scroll = new ScrollView(this);
        scroll.addView(col);
        setContentView(scroll);
    }

    @Override
    protected void onResume() {
        super.onResume();
        refresh();
    }

    private void refresh() {
        access.setText(hasAccess() ? "✅ الإذن ممنوح: التطبيق يقرأ الإشعارات" : "⚠️ لم يُمنح إذن قراءة الإشعارات بعد");
        status.setText(Sender.prefs(this).getString(Sender.STATUS_KEY, ""));
    }

    private boolean hasAccess() {
        String enabled = Settings.Secure.getString(getContentResolver(), "enabled_notification_listeners");
        if (enabled == null) return false;
        ComponentName me = new ComponentName(this, NotifService.class);
        for (String s : enabled.split(":")) {
            ComponentName c = ComponentName.unflattenFromString(s);
            if (me.equals(c)) return true;
        }
        return false;
    }

    private TextView label(LinearLayout col, String text, int sp) {
        TextView t = new TextView(this);
        t.setText(text);
        t.setTextSize(sp);
        t.setPadding(0, 24, 0, 8);
        col.addView(t);
        return t;
    }

    private EditText field(LinearLayout col, String value, int type) {
        EditText e = new EditText(this);
        e.setText(value);
        e.setInputType(type);
        e.setSingleLine(true);
        col.addView(e);
        return e;
    }

    private Button button(LinearLayout col, String text) {
        Button b = new Button(this);
        b.setText(text);
        col.addView(b);
        return b;
    }
}
