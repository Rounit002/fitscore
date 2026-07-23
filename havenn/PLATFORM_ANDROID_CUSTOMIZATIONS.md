# Platform Android Customizations

After running `cordova platform add android`, re-apply these customizations:

## 1. Gradle properties
Copy `havenn/gradle.properties` values into `platforms/android/gradle.properties` if
they were not automatically picked up.

## 2. JDK 17
Ensure `JAVA_HOME` points to JDK 17. If Gradle still picks the wrong JDK, add to
`platforms/android/gradle.properties`:
```
org.gradle.java.home=C:/Program Files/Eclipse Adoptium/jdk-17.0.16.8-hotspot
```

## 3. SDK Platform 36
Install Android SDK Platform 36 + Build-Tools 36.0.0 via Android Studio SDK Manager.

## 4. Billing permission
Verify `AndroidManifest.xml` contains `<uses-permission android:name="com.android.vending.BILLING" />`.
This should be injected by `config.xml` automatically.

## 5. Windows CON file issue
If `platforms/android/CON` exists and blocks tooling, delete it:
```
del "\\?\<full-path>\havenn\platforms\android\CON"
```
