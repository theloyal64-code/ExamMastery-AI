package com.exammastery.ai

import android.app.Activity
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.Gravity
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.ValueCallback
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var webView: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var introHandler: Handler? = null
    private var introRunnable: Runnable? = null
    private var webContentLoaded = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (savedInstanceState == null) {
            showNativeIntro()
        } else {
            showWebApp()
            webView.restoreState(savedInstanceState)
        }
    }

    private fun showNativeIntro() {
        val root = FrameLayout(this).apply {
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(Color.rgb(7, 11, 20), Color.rgb(15, 29, 48), Color.rgb(24, 58, 63))
            )
        }

        val content = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(28), dp(30), dp(28), dp(30))
            alpha = 0f
            translationY = dp(18).toFloat()
        }

        val logo = TextView(this).apply {
            text = "E"
            textSize = 48f
            setTextColor(Color.rgb(7, 18, 27))
            typeface = Typeface.create("sans-serif-black", Typeface.BOLD)
            gravity = Gravity.CENTER
            background = GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                intArrayOf(Color.rgb(104, 240, 192), Color.rgb(139, 165, 255))
            ).apply { cornerRadius = dp(27).toFloat() }
            elevation = dp(18).toFloat()
        }
        content.addView(logo, LinearLayout.LayoutParams(dp(94), dp(94)).apply {
            bottomMargin = dp(25)
        })

        val title = TextView(this).apply {
            text = "ExamMastery AI"
            textSize = 30f
            setTextColor(Color.WHITE)
            typeface = Typeface.create("sans-serif", Typeface.BOLD)
            gravity = Gravity.CENTER
            letterSpacing = -0.025f
        }
        content.addView(title)

        val subtitle = TextView(this).apply {
            text = "Your smarter path to exam success"
            textSize = 14f
            setTextColor(Color.rgb(174, 192, 211))
            gravity = Gravity.CENTER
            setPadding(0, dp(10), 0, dp(28))
        }
        content.addView(subtitle)

        val progress = ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal).apply {
            isIndeterminate = true
            indeterminateTintList = android.content.res.ColorStateList.valueOf(Color.rgb(104, 240, 192))
            progressTintList = android.content.res.ColorStateList.valueOf(Color.rgb(104, 240, 192))
        }
        content.addView(progress, LinearLayout.LayoutParams(dp(132), dp(4)))

        val loading = TextView(this).apply {
            text = "GETTING THINGS READY"
            textSize = 10f
            letterSpacing = 0.18f
            setTextColor(Color.rgb(142, 164, 190))
            gravity = Gravity.CENTER
            setPadding(0, dp(16), 0, 0)
        }
        content.addView(loading)

        root.addView(content, FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT,
            Gravity.CENTER
        ))
        setContentView(root)

        content.animate()
            .alpha(1f)
            .translationY(0f)
            .setDuration(650)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .start()
        logo.scaleX = 0.78f
        logo.scaleY = 0.78f
        logo.animate().scaleX(1f).scaleY(1f).setDuration(700)
            .setInterpolator(AccelerateDecelerateInterpolator()).start()

        introHandler = Handler(Looper.getMainLooper())
        introRunnable = Runnable { showWebApp() }
        introHandler?.postDelayed(introRunnable!!, 2400L)
    }

    private fun showWebApp() {
        if (webContentLoaded || isFinishing) return
        webContentLoaded = true
        introRunnable?.let { introHandler?.removeCallbacks(it) }
        introHandler = null
        introRunnable = null

        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.allowFileAccess = true
        webView.settings.allowContentAccess = true
        webView.settings.mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView?,
                callback: ValueCallback<Array<Uri>>?,
                params: FileChooserParams?
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                val intent = params?.createIntent()
                    ?: Intent(Intent.ACTION_GET_CONTENT).apply { type = "application/pdf" }
                return try {
                    startActivityForResult(intent, 1001)
                    true
                } catch (_: Exception) {
                    fileCallback?.onReceiveValue(null)
                    fileCallback = null
                    false
                }
            }
        }
        setContentView(webView)
        webView.loadUrl("file:///android_asset/index.html")
    }

    private fun dp(value: Int): Int = (value * resources.displayMetrics.density).toInt()

    override fun onSaveInstanceState(outState: Bundle) {
        if (::webView.isInitialized && webContentLoaded) webView.saveState(outState)
        super.onSaveInstanceState(outState)
    }

    @Deprecated("Deprecated in Android API")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == 1001) {
            val result = if (resultCode == RESULT_OK && data?.data != null) arrayOf(data.data!!) else null
            fileCallback?.onReceiveValue(result)
            fileCallback = null
        }
    }

    @Deprecated("Deprecated in Android API")
    override fun onBackPressed() {
        if (::webView.isInitialized && webContentLoaded && webView.canGoBack()) webView.goBack()
        else super.onBackPressed()
    }

    override fun onDestroy() {
        introRunnable?.let { introHandler?.removeCallbacks(it) }
        if (::webView.isInitialized) webView.destroy()
        super.onDestroy()
    }
}
