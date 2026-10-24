package Sara777.quizzes;

import android.annotation.SuppressLint;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Bitmap;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.os.Message;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

public class MainActivity extends AppCompatActivity {

    private WebView webView;
    private ValueCallback<Uri[]> filePathCallback;
    private ActivityResultLauncher<Intent> fileChooserLauncher;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        try {
            // ✅ Register File Chooser Launcher for WebView File Uploads
            fileChooserLauncher = registerForActivityResult(
                    new ActivityResultContracts.StartActivityForResult(),
                    result -> {
                        if (filePathCallback != null) {
                            Uri[] results = null;
                            if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                                String dataString = result.getData().getDataString();
                                if (dataString != null) {
                                    results = new Uri[]{Uri.parse(dataString)};
                                } else if (result.getData().getClipData() != null) {
                                    int count = result.getData().getClipData().getItemCount();
                                    results = new Uri[count];
                                    for (int i = 0; i < count; i++) {
                                        results[i] = result.getData().getClipData().getItemAt(i).getUri();
                                    }
                                }
                            }
                            filePathCallback.onReceiveValue(results);
                            filePathCallback = null;
                        }
                    }
            );

            // ✅ Enable Edge To Edge safely
            EdgeToEdge.enable(this);

            // ✅ Notch Support
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                WindowManager.LayoutParams lp = getWindow().getAttributes();
                if (lp != null) {
                    lp.layoutInDisplayCutoutMode =
                            WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
                    getWindow().setAttributes(lp);
                }
            }

            setContentView(R.layout.activity_main);

            View mainView = findViewById(R.id.main);
            webView = findViewById(R.id.webview);

            // ✅ Hide ActionBar if present
            if (getSupportActionBar() != null) {
                getSupportActionBar().hide();
            }

            // ✅ Insets Padding
            if (mainView != null) {
                ViewCompat.setOnApplyWindowInsetsListener(mainView, (v, insets) -> {
                    Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
                    v.setPadding(
                            systemBars.left,
                            systemBars.top,
                            systemBars.right,
                            systemBars.bottom
                    );
                    return insets;
                });
            }

            // ✅ OnBackPressed Handler
            getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
                @Override
                public void handleOnBackPressed() {
                    if (webView != null && webView.canGoBack()) {
                        webView.goBack();
                    } else {
                        setEnabled(false);
                        getOnBackPressedDispatcher().onBackPressed();
                    }
                }
            });

            if (webView == null) {
                Toast.makeText(this, "WebView layout not found", Toast.LENGTH_LONG).show();
                return;
            }

            // =====================================================
            // ✅ WEBVIEW SETTINGS
            // =====================================================
            WebSettings settings = webView.getSettings();

            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);

            settings.setLoadWithOverviewMode(true);
            settings.setUseWideViewPort(true);

            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);

            settings.setJavaScriptCanOpenWindowsAutomatically(true);
            settings.setSupportMultipleWindows(true);

            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);

            settings.setMediaPlaybackRequiresUserGesture(false);

            // ✅ Mixed Content
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                settings.setMixedContentMode(
                        WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                );
            }

            // =====================================================
            // ✅ REMOVE WEBVIEW IDENTITY FOR GOOGLE LOGIN
            // =====================================================
            try {
                String userAgent = settings.getUserAgentString();
                if (userAgent != null) {
                    userAgent = userAgent.replace("; wv", "");
                    settings.setUserAgentString(userAgent);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            // =====================================================
            // ✅ COOKIES
            // =====================================================
            try {
                CookieManager cookieManager = CookieManager.getInstance();
                cookieManager.setAcceptCookie(true);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                    cookieManager.setAcceptThirdPartyCookies(webView, true);
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            // =====================================================
            // ✅ WEBVIEW CLIENT
            // =====================================================
            webView.setWebViewClient(new WebViewClient() {

                @Override
                public void onPageStarted(WebView view, String url, Bitmap favicon) {
                    super.onPageStarted(view, url, favicon);
                }

                @Override
                public boolean shouldOverrideUrlLoading(
                        WebView view,
                        WebResourceRequest request
                ) {
                    if (request == null || request.getUrl() == null) return false;
                    return handleUrl(request.getUrl().toString());
                }

                @SuppressWarnings("deprecation")
                @Override
                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                    if (url == null) return false;
                    return handleUrl(url);
                }

                private boolean handleUrl(String url) {
                    // ✅ External App handling: WhatsApp, Phone, Mailto, UPI, Intent, etc.
                    if (url.startsWith("whatsapp://") || url.contains("wa.me")
                            || url.startsWith("tel:") || url.startsWith("mailto:")
                            || url.startsWith("upi:") || url.startsWith("intent://")
                            || url.startsWith("phonepe:") || url.startsWith("tez:")
                            || url.startsWith("paytmmp:") || url.startsWith("bhim:")) {
                        try {
                            Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
                            if (intent != null) {
                                startActivity(intent);
                            }
                        } catch (Exception e) {
                            try {
                                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                                startActivity(intent);
                            } catch (Exception ex) {
                                Toast.makeText(MainActivity.this, "Cannot open link", Toast.LENGTH_SHORT).show();
                            }
                        }
                        return true;
                    }

                    // ✅ Google OAuth Fix: Open Google login in external browser
                    if (url.contains("accounts.google.com") || url.contains("google.com/accounts")) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            startActivity(intent);
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                        return true;
                    }

                    // ✅ Default HTTP / HTTPS URLs: return false so WebView loads normally
                    return false;
                }

                // ✅ Handle Renderer Termination to Prevent App Crashes / Deep Sleep Warnings
                @Override
                public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        if (view != null) {
                            try {
                                ViewGroup parent = (ViewGroup) view.getParent();
                                if (parent != null) {
                                    parent.removeView(view);
                                }
                                view.destroy();
                            } catch (Exception e) {
                                e.printStackTrace();
                            }
                        }
                        if (!isFinishing() && !isDestroyed()) {
                            runOnUiThread(() -> {
                                try {
                                    recreate();
                                } catch (Exception e) {
                                    e.printStackTrace();
                                }
                            });
                        }
                        return true; // Prevents whole app process from crashing
                    }
                    return super.onRenderProcessGone(view, detail);
                }

                // ✅ Ignore minor SSL errors to prevent WebView blank screen crashes
                @SuppressLint("WebViewClientOnReceivedSslError")
                @Override
                public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                    if (handler != null) {
                        handler.proceed();
                    }
                }
            });

            // =====================================================
            // ✅ CHROME CLIENT
            // =====================================================
            webView.setWebChromeClient(new WebChromeClient() {

                @Override
                public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                    if (MainActivity.this.filePathCallback != null) {
                        try {
                            MainActivity.this.filePathCallback.onReceiveValue(null);
                        } catch (Exception ignored) {}
                        MainActivity.this.filePathCallback = null;
                    }
                    MainActivity.this.filePathCallback = filePathCallback;

                    if (fileChooserParams == null) {
                        if (MainActivity.this.filePathCallback != null) {
                            MainActivity.this.filePathCallback.onReceiveValue(null);
                            MainActivity.this.filePathCallback = null;
                        }
                        return false;
                    }

                    try {
                        Intent intent = fileChooserParams.createIntent();
                        fileChooserLauncher.launch(intent);
                    } catch (Exception e) {
                        if (MainActivity.this.filePathCallback != null) {
                            try {
                                MainActivity.this.filePathCallback.onReceiveValue(null);
                            } catch (Exception ignored) {}
                            MainActivity.this.filePathCallback = null;
                        }
                        Toast.makeText(MainActivity.this, "Cannot open file chooser", Toast.LENGTH_SHORT).show();
                        return false;
                    }
                    return true;
                }

                @Override
                public boolean onCreateWindow(
                        WebView view,
                        boolean isDialog,
                        boolean isUserGesture,
                        Message resultMsg
                ) {
                    if (resultMsg == null) return false;

                    try {
                        WebView newWebView = new WebView(MainActivity.this);
                        WebSettings newSettings = newWebView.getSettings();
                        newSettings.setJavaScriptEnabled(true);
                        newSettings.setDomStorageEnabled(true);

                        newWebView.setWebViewClient(new WebViewClient() {
                            @Override
                            public boolean shouldOverrideUrlLoading(
                                    WebView view,
                                    WebResourceRequest request
                            ) {
                                if (request == null || request.getUrl() == null) return false;
                                return openExternal(request.getUrl().toString());
                            }

                            @SuppressWarnings("deprecation")
                            @Override
                            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                                return openExternal(url);
                            }

                            private boolean openExternal(String url) {
                                if (url != null) {
                                    try {
                                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                                        startActivity(intent);
                                    } catch (Exception e) {
                                        e.printStackTrace();
                                    }
                                }
                                return true;
                            }
                        });

                        if (resultMsg.obj instanceof WebView.WebViewTransport) {
                            WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                            transport.setWebView(newWebView);
                            resultMsg.sendToTarget();
                            return true;
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                    return false;
                }
            });

            // =====================================================
            // ✅ LOAD WEBSITE
            // =====================================================
            webView.loadUrl("https://app.gama567.biz/");
        } catch (Throwable t) {
            t.printStackTrace();
            Toast.makeText(this, "Error starting app: " + t.getLocalizedMessage(), Toast.LENGTH_LONG).show();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
            webView.pauseTimers(); // ✅ Pause JS timers to stop CPU & battery drain in background
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
            webView.resumeTimers(); // ✅ Resume JS timers when user returns
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            try {
                webView.stopLoading();
                webView.setWebChromeClient(null);
                webView.setWebViewClient(null);
                webView.clearHistory();
                webView.removeAllViews();
                webView.destroy();
            } catch (Exception e) {
                e.printStackTrace();
            }
            webView = null;
        }
        super.onDestroy();
    }
}
