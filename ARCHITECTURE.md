# Architecture

See `PROJECT_SETUP.md` Section 1 for the architecture overview.

```
[React SPA (Vite, HashRouter)] --HTTP + session cookie--> [Express API] --> [PostgreSQL]
        |                                                       |
  [Cordova Android WebView] -- same SPA bundled in www/ --> (CORS + session, RevenueCat plugin)
```

Detailed architecture documentation to be expanded here.
