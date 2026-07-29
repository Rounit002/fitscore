/**
 * Android runtime permissions (Cordova only).
 *
 * The scanner uses `navigator.mediaDevices.getUserMedia`. In a WebView that call
 * only succeeds once the *app* holds the CAMERA permission, and cordova-android
 * does not request it automatically. `cordova-plugin-android-permissions` gives
 * us the native prompt.
 *
 * Everything here degrades to a resolved no-op on the web, where the browser
 * handles its own permission prompt.
 */

import { isCordova } from './platformUtils';

function getPermissions() {
  return typeof window !== 'undefined' ? window.cordova?.plugins?.permissions : undefined;
}

/**
 * Ensure the app holds android.permission.CAMERA, prompting if needed.
 * @returns {Promise<boolean>} true when granted (or when running on the web).
 */
export function requestAndroidCameraPermission() {
  return new Promise((resolve) => {
    const permissions = getPermissions();
    if (!isCordova || !permissions) {
      resolve(true);
      return;
    }

    const CAMERA = permissions.CAMERA;

    permissions.checkPermission(
      CAMERA,
      (status) => {
        if (status?.hasPermission) {
          resolve(true);
          return;
        }
        permissions.requestPermission(
          CAMERA,
          (result) => resolve(Boolean(result?.hasPermission)),
          () => resolve(false),
        );
      },
      () => resolve(false),
    );
  });
}
