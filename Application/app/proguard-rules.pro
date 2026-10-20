# Keep all project application classes
-keep class com.gama567.app.** { *; }

# Keep WebView and JavaScript interface methods
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

-keep class android.webkit.** { *; }
-keep class androidx.webkit.** { *; }

# Keep AndroidX and AppCompat components
-keep public class * extends androidx.appcompat.app.AppCompatActivity
-keep public class * extends android.app.Activity
-keep public class * extends android.view.View

# Preserve line numbers and attributes for crash reporting
-keepattributes SourceFile,LineNumberTable,JavascriptInterface,*Annotation*