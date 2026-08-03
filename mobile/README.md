# bitezsnap Android app (Apache Cordova)

This directory wraps the existing Vite/React SPA (`../Frontend`) in an Apache
Cordova Android shell. There is **no separate mobile codebase** — the same SPA is
compiled and bundled into the APK, so any feature built for the web ships to
Android automatically.

```
Frontend/  ──  npm run build:cordova  ──▶  Frontend/dist
                                              │  npm run sync:www
                                              ▼
mobile/www/  ──  cordova build android  ──▶  app-debug.apk / app-release.aab
```

`www/`, `platforms/`, and `plugins/` are generated build output and are
git-ignored. Never edit them by hand.

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | >= 20.17 or >= 22.9 | Required by cordova-android 15 |
| JDK | 17 | AGP 8.x fails on JDK 11 |
| Android SDK Platform | 36 | plus Build-Tools 36.0.0 |
| Cordova CLI | 13.x | installed locally as a devDependency |

`JAVA_HOME` and `ANDROID_HOME` must be set.

## One-time setup

```powershell
cd mobile
npm install
npx cordova platform add android

# Create the mobile build env (see the template for what each var does)
copy ..\Frontend\.env.cordova.example ..\Frontend\.env.cordova
```

Then edit `Frontend/.env.cordova` and set `VITE_MOBILE_API_URL` to your
publicly reachable API URL. This matters: the app is served from
`https://localhost` inside the WebView, so a relative path or a `localhost` URL
can never reach the backend from a phone.

## Build

```powershell
cd mobile

npm run build:android          # debug APK
npm run build:android:release  # signed release APK (needs build.json)
npm run build:aab              # signed AAB for the Play Store
npm run run:android            # build + install on a connected device
```

Each script rebuilds the SPA and re-syncs `www/` first, so you never ship a
stale bundle.

Note the `-- --packageType=...` in these scripts. cordova-android 15 changed the
default release artefact to an **AAB**, so a release build without an explicit
`--packageType=apk` silently produces a bundle instead of an APK. The `--`
separator is required: Cordova only forwards args that appear after it to the
platform. It also means these must be run through `npm run`, not `npx cordova`
directly — `npx` swallows the first `--`, and Cordova's own arg parser drops the
unknown `--packageType` flag, so the option never reaches the platform.

Outputs:
- APK: `platforms/android/app/build/outputs/apk/{debug,release}/`
- AAB: `platforms/android/app/build/outputs/bundle/release/`

## Icons and splash screen

Every rasterised brand asset comes from two committed masters at the repo root:

| Master | Size | Used for |
|---|---|---|
| `resources/icon.png` | 1024x1024, opaque | launcher icons, favicons, PWA icons |
| `resources/splash.png` | 2732x2732, transparent | the Android 12+ splash icon |

`splash.png` keeps the mark at ~52% of the canvas: the system masks the splash
icon to a circle and may crop further per device, so the mark must stay well
inside the safe area.

```powershell
npm run gen:res
```

This writes both platforms in one pass:

- `mobile/res/` — 6 legacy launcher icons, 6 adaptive foreground + 6 adaptive
  background layers, the splash icon, and the 512px Play Store icon.
- `Frontend/public/icons/` + `Frontend/public/favicon.ico` — favicon PNGs,
  apple-touch-icon, and the 192/512 PWA icons referenced by
  `Frontend/public/manifest.webmanifest`.

Both output dirs are git-ignored and regenerated; only the masters are committed.
`config.xml` and `index.html` reference these paths, so re-run this after
changing the logo, then rebuild.

Note: `cordova-res` is **not** used. It emits `<splash>` tags, which
cordova-android 15 rejects outright ("The `<splash>` tags were detected and are
no longer supported"), and its full-screen splash PNGs have no meaning under the
Android 12 splash API. `generate-resources.js` targets what this platform
version actually consumes.

Note: the adaptive icon `background` must be an **image**, not a colour literal.
cordova-android always emits `@mipmap/ic_launcher_background`, so a `#RRGGBB`
value fails resource linking with "resource mipmap/ic_launcher_background not
found". `generate-resources.js` therefore emits a flat background PNG per density.

## On-device verification

With the app running on a device/emulator, these scripts attach to the live
WebView over the Chrome DevTools Protocol and assert the platform integration
(native bridge, HashRouter, secure context, camera, API/auth):

```powershell
# find the WebView pid, then forward its devtools socket
adb shell cat /proc/net/unix | Select-String webview_devtools_remote
adb forward tcp:9333 localabstract:webview_devtools_remote_<pid>

node scripts/verify-device.js 9333          # shell + bridge + camera + API
node scripts/verify-api-in-webview.js 9333  # real register -> Bearer round trip
```

`verify-api-in-webview.js` needs a backend reachable from the device. Note the
WebView disallows cleartext, so an `http://localhost:5000` backend is blocked
from the `https://localhost` page — use an https URL or a tunnel.

## Release signing

Release builds need a `mobile/build.json` (git-ignored, along with `*.keystore`):

```json
{
  "android": {
    "release": {
      "keystore": "nutriscan-release.keystore",
      "storePassword": "...",
      "alias": "nutriscan",
      "password": "...",
      "keystoreType": ""
    }
  }
}
```

Generate the keystore once and back it up — losing it means you can no longer
publish updates to an existing Play listing:

```powershell
keytool -genkey -v -keystore nutriscan-release.keystore -alias nutriscan `
        -keyalg RSA -keysize 2048 -validity 10000
```

Bump `android-versionCode` in `config.xml` for every Play upload.

## How the mobile build differs from web

These are the platform differences the conversion required. All of them are
conditional, so the web build is unchanged.

| Concern | Web | Cordova |
|---------|-----|---------|
| Router | `BrowserRouter` | `HashRouter` — no server exists to resolve deep paths like `/dashboard` on reload |
| API base | `VITE_API_URL` | `VITE_MOBILE_API_URL`, absolute and baked into the bundle |
| Auth | HttpOnly cookie | `Authorization: Bearer` — the WebView blocks the API's third-party cookie |
| Asset paths | absolute (`/assets`) | relative (`./assets`) |
| Camera | browser permission prompt | native `CAMERA` runtime permission |

The mobile build is identified by `VITE_BUILD_TARGET=cordova` via
`isCordova` in `Frontend/src/utils/platformUtils.js`.

### Auth note

Because the API is a different origin than the app shell, Android's WebView
blocks the `SameSite=None` auth cookie. Mobile clients therefore send
`X-Client: mobile` on login, the backend includes the JWT in that response, and
the token is stored in WebView-local `localStorage` and replayed as a Bearer
header. `Backend/middleware/auth.js` accepts either the cookie or the header,
preferring the cookie. Browsers never receive the token in a response body.

## Troubleshooting

**`Error while dexing` / `not enough space on the disk`** — Gradle needs several
GB on the drive holding its cache and temp dir. Redirect both to a drive with
space:

```powershell
$env:GRADLE_USER_HOME='D:\gradle-home'; $env:TEMP='D:\build-tmp'
```

**Blank screen on launch** — remote-debug via `chrome://inspect` and check the
console. Usually a stale `www/`; re-run `npm run sync:www`.

**Camera preview never appears** — confirm the app holds CAMERA in Android
settings. `getUserMedia` also requires a secure context, which is why the shell
is served from `https://localhost` (`scheme`/`hostname` in `config.xml`).

**Requests fail with a CORS error** — add the origin to
`Backend/config/cors.js`; `https://localhost` is already allowed.

**Verify the native bridge** in the device console:

```js
typeof window.cordova  // "object"
```
