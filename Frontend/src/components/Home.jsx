import { useRef, useState, useEffect, useCallback } from 'react';
import { AlertCircle, Camera, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { requestAndroidCameraPermission } from '../utils/nativePermissions';

/* ------------------------------------------------------------------ */
/*  Scan screen                                                       */
/* ------------------------------------------------------------------ */

/* Deliberately just three things: the live camera, a shutter, and a gallery
   picker. Everything else this screen used to carry (torch, zoom slider,
   rule-of-thirds grid, focus reticle, corner brackets, status pill, alignment
   hint, note field, quota bar, reset button, barcode tile, back and history
   buttons in a custom header) has been removed — none of it was required to take
   a photo, and together it left the viewfinder competing with nine other
   controls on a phone. */

// Tried in order. Some devices/WebViews reject an exact `environment` facing mode
// or a specific resolution, so we degrade to plain `video: true` before giving up.
const CAMERA_CONSTRAINTS = [
  {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  },
  { audio: false, video: { facingMode: 'environment' } },
  { audio: false, video: true },
];

const PERMISSION_ERRORS = ['NotAllowedError', 'PermissionDeniedError', 'SecurityError'];

const MAX_UPLOAD_DIM = 1200;

export default function Home({ onImageSelected }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [toast, setToast] = useState(null);
  const activeStreamRef = useRef(null);
  // Guards against races: StrictMode double-mounts and rapid retaps can leave an
  // in-flight getUserMedia() that resolves after we no longer want it.
  const startTokenRef = useRef(0);
  const toastTimerRef = useRef(0);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => () => clearTimeout(toastTimerRef.current), []);

  const stopStream = useCallback(() => {
    activeStreamRef.current?.getTracks().forEach((track) => track.stop());
    activeStreamRef.current = null;
  }, []);

  const startCamera = useCallback(async () => {
    const token = ++startTokenRef.current;
    setPermissionDenied(false);
    setCameraError(null);
    setIsStartingCamera(true);

    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        // Almost always an insecure context: getUserMedia is only exposed on
        // https://, http://localhost or the Cordova app shell.
        setCameraError(
          t('camera_requires_https', 'Camera needs a secure connection (https or localhost).')
        );
        return;
      }

      // In the Android WebView getUserMedia fails until the app itself holds the
      // CAMERA permission. No-op on the web (the browser prompts by itself).
      const granted = await requestAndroidCameraPermission();
      if (token !== startTokenRef.current) return;
      if (!granted) {
        setPermissionDenied(true);
        return;
      }

      let lastError = null;
      for (const constraints of CAMERA_CONSTRAINTS) {
        try {
          const nextStream = await navigator.mediaDevices.getUserMedia(constraints);

          if (token !== startTokenRef.current) {
            nextStream.getTracks().forEach((track) => track.stop());
            return;
          }

          stopStream();
          activeStreamRef.current = nextStream;
          setStream(nextStream);
          return;
        } catch (err) {
          lastError = err;
          // A denial or missing device won't be fixed by looser constraints.
          if (PERMISSION_ERRORS.includes(err?.name) || err?.name === 'NotFoundError') break;
        }
      }

      if (token !== startTokenRef.current) return;

      console.error('Camera access denied or not available:', lastError);
      setStream(null);
      stopStream();

      if (PERMISSION_ERRORS.includes(lastError?.name)) {
        setPermissionDenied(true);
      } else if (lastError?.name === 'NotFoundError' || lastError?.name === 'OverconstrainedError') {
        setCameraError(t('camera_not_found', 'No camera was found on this device.'));
      } else if (lastError?.name === 'NotReadableError' || lastError?.name === 'TrackStartError') {
        setCameraError(t('camera_in_use', 'The camera is already in use by another app or tab.'));
      } else {
        setCameraError(lastError?.message || t('camera_unavailable'));
      }
    } finally {
      if (token === startTokenRef.current) setIsStartingCamera(false);
    }
  }, [stopStream, t]);

  const hasCameraAccess = !!stream;

  // Attach the stream once the <video> element is actually in the DOM.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    const played = video.play();
    if (played?.catch) played.catch(() => {});
  }, [stream]);

  useEffect(() => {
    // Deferred so the first state updates land outside the effect body.
    const timer = setTimeout(() => startCamera(), 0);
    return () => {
      clearTimeout(timer);
      startTokenRef.current += 1;
      stopStream();
    };
  }, [startCamera, stopStream]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    // Allow re-picking the same file later.
    e.target.value = '';
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      let { width, height } = bitmap;
      if (width > height) {
        if (width > MAX_UPLOAD_DIM) {
          height = Math.round((height * MAX_UPLOAD_DIM) / width);
          width = MAX_UPLOAD_DIM;
        }
      } else if (height > MAX_UPLOAD_DIM) {
        width = Math.round((width * MAX_UPLOAD_DIM) / height);
        height = MAX_UPLOAD_DIM;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      onImageSelected(canvas.toDataURL('image/jpeg', 0.85));
    } catch (err) {
      console.error('Failed to process image:', err);
      showToast(t('sharing_failed', 'Failed to process image.'), 'error');
    }
  };

  const openNativeCamera = () => {
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const openGallery = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    // No live preview (denied, unavailable, or unsupported) falls back to the
    // device's own camera app rather than doing nothing.
    if (!hasCameraAccess || !video) {
      openNativeCamera();
      return;
    }
    if (!video.videoWidth || !video.videoHeight) {
      showToast(t('camera_warming_up', 'Camera is still starting, try again.'), 'error');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    onImageSelected(canvas.toDataURL('image/jpeg', 0.85));
  };

  return (
    <div className="ns-scan">
      {toast && (
        <div
          className="ns-scan-toast"
          data-tone={toast.type}
          role="status"
          aria-live="polite"
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span className="min-w-0 flex-1">{toast.message}</span>
        </div>
      )}

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Viewfinder fills the screen. The camera is the content, so it gets the
          space rather than sharing it with a card, a frame and a hint bar. */}
      <div className="ns-scan-view">
        {/* Always mounted so the ref exists before the stream arrives. */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="ns-scan-video"
          data-live={hasCameraAccess || undefined}
        />

        {!hasCameraAccess && (
          <div className="ns-scan-fallback">
            {/* Empty-state context = 32 (TOKENS 7). Was 44, which is the
                toolbar-button box size, not an icon size. */}
            <Camera size={32} aria-hidden="true" />
            {permissionDenied ? (
              <>
                <p className="ns-scan-fallback-title">
                  {t('camera_permission_denied', 'Camera access denied')}
                </p>
                <p className="ns-scan-fallback-body">
                  {t(
                    'camera_permission_hint',
                    'Open your browser settings and allow camera access, then tap below.'
                  )}
                </p>
              </>
            ) : (
              <>
                <p className="ns-scan-fallback-title">
                  {isStartingCamera
                    ? t('starting_camera', 'Starting camera...')
                    : t('camera_unavailable')}
                </p>
                {!isStartingCamera && cameraError && (
                  <p className="ns-scan-fallback-body">{cameraError}</p>
                )}
              </>
            )}

            {!isStartingCamera && (
              <div className="ns-scan-fallback-actions">
                <button type="button" onClick={startCamera} className="ns-scan-retry">
                  {t('try_again', 'Try again')}
                </button>
                <button type="button" onClick={openNativeCamera} className="ns-scan-native">
                  {t('use_device_camera', 'Use device camera')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Two controls: take a picture, or pick one. The shutter is centred and
          the gallery sits beside it, so neither competes for the thumb. */}
      <div className="ns-scan-controls">
        <button
          type="button"
          onClick={capturePhoto}
          aria-label={t('capture_photo', 'Capture photo')}
          className="ns-scan-shutter"
        >
          <span className="ns-scan-shutter-core" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={openGallery}
          aria-label={t('gallery')}
          className="ns-scan-gallery"
        >
          <ImageIcon size={22} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
