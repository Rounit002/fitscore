cordova.define('cordova/plugin_list', function(require, exports, module) {
  module.exports = [
    {
      "id": "cordova-plugin-fitscore-play-integrity.requestHash",
      "file": "plugins/cordova-plugin-fitscore-play-integrity/www/request-hash.js",
      "pluginId": "cordova-plugin-fitscore-play-integrity"
    },
    {
      "id": "cordova-plugin-fitscore-play-integrity.PlayIntegrity",
      "file": "plugins/cordova-plugin-fitscore-play-integrity/www/play-integrity.js",
      "pluginId": "cordova-plugin-fitscore-play-integrity",
      "clobbers": [
        "FitScorePlayIntegrity"
      ]
    },
    {
      "id": "cordova-plugin-android-permissions.Permissions",
      "file": "plugins/cordova-plugin-android-permissions/www/permissions.js",
      "pluginId": "cordova-plugin-android-permissions",
      "clobbers": [
        "cordova.plugins.permissions"
      ]
    },
    {
      "id": "cordova-plugin-secure-storage-echo.SecureStorage",
      "file": "plugins/cordova-plugin-secure-storage-echo/www/securestorage.js",
      "pluginId": "cordova-plugin-secure-storage-echo",
      "clobbers": [
        "SecureStorage"
      ]
    },
    {
      "id": "cordova-plugin-purchases.plugin",
      "file": "plugins/cordova-plugin-purchases/www/plugin.js",
      "pluginId": "cordova-plugin-purchases",
      "clobbers": [
        "Purchases"
      ]
    }
  ];
  module.exports.metadata = {
    "cordova-annotated-plugin-android": "1.0.4",
    "cordova-plugin-fitscore-play-integrity": "1.0.0",
    "cordova-plugin-android-permissions": "1.1.5",
    "cordova-plugin-secure-storage-echo": "5.1.1",
    "cordova-plugin-purchases": "8.0.7"
  };
});