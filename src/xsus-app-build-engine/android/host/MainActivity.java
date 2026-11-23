package com.xsusstudio.host;

import android.app.Activity;
import android.os.Bundle;
import android.view.WindowInsets;
import android.view.View;
import android.webkit.*;
import java.io.ByteArrayInputStream;
import java.io.IOException;

public final class MainActivity extends Activity {
    private static final String ORIGIN = "https://appassets.androidplatform.net/";
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        WebView view = new WebView(this);
        setContentView(view);
        view.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() { public WindowInsets onApplyWindowInsets(View v, WindowInsets insets) {
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets; }
        });
        WebSettings settings = view.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        view.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                return !request.getUrl().toString().equals(ORIGIN + "index.html");
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (request.getMethod().equals("GET") && url.startsWith(ORIGIN)) {
                    String path = request.getUrl().getPath();
                    String type = "/index.html".equals(path) ? "text/html" :
                        "/styles.css".equals(path) ? "text/css" :
                        "/main.js".equals(path) ? "application/javascript" : null;
                    if (type != null) {
                        try { return new WebResourceResponse(type, "UTF-8", getAssets().open(path.substring(1))); }
                        catch (IOException missing) { }
                    }
                }
                return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found", null,
                    new ByteArrayInputStream(new byte[0]));
            }
        });
        view.loadUrl(ORIGIN + "index.html");
    }
}
