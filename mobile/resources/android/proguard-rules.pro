# Preserve JavaScript bridge entry points while allowing the rest of the APK to
# be optimized and obfuscated by R8.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class org.apache.cordova.** { *; }
-dontwarn org.apache.cordova.**
