import { useRef, useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Barcode,
  Camera,
  CheckCircle2,
  History,
  Image as ImageIcon,
  Mic,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import ScanQuotaBar from './ScanQuotaBar';

export default function Home({ onImageSelected, onBack, onNavigateBarcode, onNavigateHistory }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const [hasCameraAccess, setHasCameraAccess] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [zoomSupported, setZoomSupported] = useState(false);
  const [isNoteExpanded, setIsNoteExpanded] = useState(false);
  const [note, setNote] = useState('');
  const [toast, setToast] = useState(null);
  const [quotaDepleted, setQuotaDepleted] = useState(false);
  const activeStreamRef = useRef(null);

  const handleQuotaChecked = (quotaData) => {
    const used = quotaData.used ?? 0;
    const limit = quotaData.limit ?? 20;
    setQuotaDepleted(used >= limit);
  };

  const startCamera = async () => {
    setPermissionDenied(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      activeStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setHasCameraAccess(true);
      }
      const track = stream.getVideoTracks()[0];
      const capabilities = track?.getCapabilities?.();
      setZoomSupported(!!capabilities?.zoom);
    } catch (err) {
      console.error('Camera access denied or not available:', err);
      setHasCameraAccess(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
      }
    }
  };

  const toggleTorch = async () => {
    const newState = !torchOn;
    setTorchOn(newState);
    const track = activeStreamRef.current?.getVideoTracks()[0];
    if (track) {
      try {
        await track.applyConstraints({ advanced: [{ torch: newState }] });
      } catch (err) {
        console.warn('Torch not supported on this device:', err);
      }
    }
  };

  const handleZoomChange = async (value) => {
    const num = parseFloat(value);
    setZoom(num);
    const track = activeStreamRef.current?.getVideoTracks()[0];
    if (track && zoomSupported) {
      try {
        await track.applyConstraints({ advanced: [{ zoom: num }] });
      } catch (err) {
        console.warn('Zoom constraint failed, falling back to CSS scale:', err);
      }
    }
  };

  const resetCamera = () => {
    activeStreamRef.current?.getTracks().forEach((track) => track.stop());
    activeStreamRef.current = null;
    setHasCameraAccess(false);
    startCamera();
  };

  useEffect(() => {
    startCamera();
    return () => {
      activeStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = async (e) => {
    if (quotaDepleted) {
      showToast('Scan limit reached. Please upgrade your plan.', 'error');
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const maxDim = 1200;
      let { width, height } = bitmap;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else if (height > maxDim) {
        width = Math.round((width * maxDim) / height);
        height = maxDim;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
      bitmap.close();
      onImageSelected(canvas.toDataURL('image/jpeg', 0.85));
      showToast(t('image_processed'), 'success');
    } catch (err) {
      console.error('Failed to process image:', err);
      showToast(t('sharing_failed', 'Failed to process image.'), 'error');
    }
  };

  const capturePhoto = () => {
    if (quotaDepleted) {
      showToast('Scan limit reached. Please upgrade your plan.', 'error');
      return;
    }
    if (hasCameraAccess && videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
      onImageSelected(canvas.toDataURL('image/jpeg', 0.85));
      showToast(t('photo_captured'), 'success');
    } else if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const openGallery = () => {
    if (quotaDepleted) {
      showToast('Scan limit reached. Please upgrade your plan.', 'error');
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[var(--ns-surface)] text-[var(--ns-on-surface)] lg:min-h-[calc(100dvh-76px)]">
      {toast && (
        <div
          className={[
            'fixed left-1/2 top-5 z-[120] flex w-[min(calc(100%-32px),420px)] -translate-x-1/2 items-center gap-3',
            'rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-2xl',
            toast.type === 'error' ? 'bg-[var(--ns-error)]' : 'bg-[var(--ns-success)]',
          ].join(' ')}
          role="status"
          aria-live="polite"
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span className="min-w-0 flex-1">{toast.message}</span>
        </div>
      )}

      <header className="z-20 flex h-16 shrink-0 items-center justify-between border-b border-[var(--ns-border-light)] bg-[var(--ns-glass-surface)] px-4 shadow-sm backdrop-blur-xl sm:px-6 lg:hidden">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('back', 'Back')}
          className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--ns-border-light)] bg-[var(--ns-card-bg)] text-[var(--ns-on-surface-var)] shadow-sm transition active:scale-95"
        >
          <ArrowLeft size={21} />
        </button>
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-xl bg-ns-primary text-white shadow-[0_4px_12px_color-mix(in_srgb,var(--ns-primary)_35%,transparent)]">
            <Camera size={15} />
          </span>
          <h1 className="font-[var(--font-headline)] text-base font-bold tracking-wide text-[var(--ns-on-surface)]">
            {t('scanner')}
          </h1>
        </div>
        <button
          type="button"
          onClick={onNavigateHistory}
          aria-label={t('history')}
          className="grid h-11 w-11 place-items-center rounded-2xl border border-[var(--ns-border-light)] bg-[var(--ns-card-bg)] text-[var(--ns-on-surface-var)] shadow-sm transition active:scale-95"
        >
          <History size={21} />
        </button>
      </header>

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />

      <main className="relative flex min-h-0 flex-1 items-center justify-center px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
        <div className="relative flex w-full max-w-[560px] flex-col items-center gap-5">
          <div className="relative w-full max-w-[430px]">
            {/* ambient brand glow behind the lens */}
            <div
              aria-hidden="true"
              className="scan-lens-glow pointer-events-none absolute -inset-3 -z-0 rounded-[32px] opacity-70 blur-2xl"
            />
            <div className="scan-lens-frame relative z-10 aspect-[3/4] w-full overflow-hidden rounded-[24px] shadow-[0_18px_50px_rgba(0,0,0,0.18)]">
              <div className="absolute inset-0 grid place-items-center overflow-hidden bg-neutral-900">
                {hasCameraAccess ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="h-full w-full object-cover"
                    style={{ transform: zoomSupported ? 'none' : `scale(${zoom})` }}
                  />
                ) : permissionDenied ? (
                  <div className="flex max-w-[300px] flex-col items-center gap-3 px-6 text-center">
                    <Camera size={42} className="text-white/60" />
                    <p className="text-sm font-semibold text-white">
                      {t('camera_permission_denied', 'Camera access denied')}
                    </p>
                    <p className="text-xs font-semibold leading-5 text-white/60">
                      {t('camera_permission_hint', 'Open your browser settings and allow camera access, then tap below.')}
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="rounded-xl bg-ns-primary px-5 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition active:scale-95"
                    >
                      {t('try_again', 'Try again')}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <Camera size={52} className="text-white/50" />
                    <p className="text-sm font-bold text-white/60">{t('camera_unavailable')}</p>
                  </div>
                )}

                {/* sweeping scan beam */}
                {hasCameraAccess && (
                  <div className="scan-beam pointer-events-none absolute left-[8%] right-[8%] top-1/2 h-[2px] -translate-y-1/2" />
                )}

                {/* rule-of-thirds grid */}
                <div className="pointer-events-none absolute inset-7 opacity-50">
                  <span className="absolute left-1/3 top-0 h-full w-px bg-white/25" />
                  <span className="absolute left-2/3 top-0 h-full w-px bg-white/25" />
                  <span className="absolute top-1/3 left-0 h-px w-full bg-white/25" />
                  <span className="absolute top-2/3 left-0 h-px w-full bg-white/25" />
                </div>

                {/* center focus reticle */}
                <div className="scan-reticle pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2">
                  <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-white/80" />
                  <span className="absolute left-1/2 bottom-0 h-3 w-px -translate-x-1/2 bg-white/80" />
                  <span className="absolute top-1/2 left-0 w-3 h-px -translate-y-1/2 bg-white/80" />
                  <span className="absolute top-1/2 right-0 w-3 h-px -translate-y-1/2 bg-white/80" />
                </div>

                {/* corner brackets */}
                <div className="pointer-events-none absolute inset-6">
                  <span className="absolute left-0 top-0 h-12 w-12 rounded-tl-2xl border-l-[3px] border-t-[3px] border-white/80" />
                  <span className="absolute right-0 top-0 h-12 w-12 rounded-tr-2xl border-r-[3px] border-t-[3px] border-white/80" />
                  <span className="absolute bottom-0 left-0 h-12 w-12 rounded-bl-2xl border-b-[3px] border-l-[3px] border-white/80" />
                  <span className="absolute bottom-0 right-0 h-12 w-12 rounded-br-2xl border-b-[3px] border-r-[3px] border-white/80" />
                </div>

                {/* status pill — top left */}
                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-xl">
                  <span
                    className={[
                      'h-2 w-2 rounded-full',
                      hasCameraAccess ? 'bg-[var(--ns-success)] shadow-[0_0_8px_var(--ns-success)]' : 'bg-white/50',
                    ].join(' ')}
                  />
                  {hasCameraAccess ? t('scan_ready', 'Ready to scan') : t('camera_unavailable')}
                </div>

                <button
                  type="button"
                  onClick={toggleTorch}
                  aria-label={torchOn ? t('torch_off', 'Turn torch off') : t('torch_on', 'Turn torch on')}
                  aria-pressed={torchOn}
                  className={[
                    'absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-2xl border backdrop-blur-xl transition active:scale-95',
                    torchOn
                      ? 'border-amber-300 bg-amber-400 text-white shadow-lg shadow-amber-400/30'
                      : 'border-white/25 bg-black/35 text-white',
                  ].join(' ')}
                >
                  <Zap size={20} />
                </button>

                <div className="absolute bottom-5 left-5 right-5 rounded-full bg-black/45 px-4 py-2 text-center text-xs font-semibold text-white backdrop-blur-xl">
                  {t('align_in_frame', 'Align the product or label inside the frame')}
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[240px]">
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => handleZoomChange(e.target.value)}
              aria-label={t('zoom_level', 'Zoom level')}
              aria-valuetext={`${zoom.toFixed(1)}x`}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[color-mix(in_srgb,var(--ns-on-surface)_16%,transparent)] accent-ns-primary"
            />
            <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-[var(--ns-outline)]">
              <span>1X</span>
              <span>{t('zoom')}</span>
              <span>3X</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="z-20 w-full shrink-0 border-t border-[var(--ns-border-light)] bg-[var(--ns-glass-surface)] px-4 pb-[calc(16px+env(safe-area-inset-bottom,0px))] pt-4 shadow-[0_-18px_42px_rgba(0,0,0,0.08)] backdrop-blur-xl sm:px-6 lg:mx-auto lg:mb-7 lg:max-w-[760px] lg:rounded-[24px] lg:border lg:px-6">
        <ScanQuotaBar onQuotaChecked={handleQuotaChecked} />

        <button
          type="button"
          className="mb-4 flex min-h-13 w-full items-center gap-3 rounded-2xl border border-[var(--ns-border-light)] bg-[var(--ns-card-bg)] px-4 text-left text-[var(--ns-on-surface-var)] shadow-sm transition focus-within:border-[color-mix(in_srgb,var(--ns-primary)_45%,transparent)]"
          onClick={() => setIsNoteExpanded(!isNoteExpanded)}
        >
          <Mic size={20} className={note ? 'text-ns-primary' : 'text-[var(--ns-outline)]'} />
          {isNoteExpanded ? (
            <input
              autoFocus
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('add_nutritional_note')}
              className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[var(--ns-on-surface)] outline-none placeholder:text-[var(--ns-outline)]"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {note || t('add_note')}
            </span>
          )}
          {note && !isNoteExpanded && <CheckCircle2 size={16} className="text-ns-primary" />}
        </button>

        <div className="mb-4 grid grid-cols-[64px_1fr_64px] items-center gap-4">
          <button
            type="button"
            onClick={resetCamera}
            aria-label={t('reset_camera', 'Reset camera')}
            className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--ns-border-light)] bg-[var(--ns-card-bg)] text-[var(--ns-on-surface-var)] shadow-sm transition active:scale-95"
          >
            <RotateCcw size={22} />
          </button>

          <div className="flex flex-col items-center gap-1.5">
            <button
              type="button"
              onClick={capturePhoto}
              disabled={quotaDepleted}
              aria-label={t('capture_photo', 'Capture photo')}
              className="group mx-auto grid h-20 w-20 place-items-center rounded-full border-[5px] border-[color-mix(in_srgb,var(--ns-primary)_75%,white)] bg-[var(--ns-card-bg)] shadow-[0_12px_32px_color-mix(in_srgb,var(--ns-primary)_30%,transparent)] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="h-14 w-14 rounded-full bg-ns-primary transition-transform group-active:scale-90" />
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--ns-outline)]">
              {t('tap_to_capture', 'Tap to capture')}
            </span>
          </div>

          <button
            type="button"
            onClick={openGallery}
            aria-label={t('gallery')}
            className="grid h-14 w-14 place-items-center rounded-2xl border border-[var(--ns-border-light)] bg-[var(--ns-card-bg)] text-[var(--ns-on-surface-var)] shadow-sm transition active:scale-95"
          >
            <ImageIcon size={22} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onNavigateBarcode}
            className="group flex min-h-[64px] items-center justify-center gap-2.5 rounded-2xl border border-[var(--ns-border-light)] bg-[var(--ns-card-bg)] px-3 text-[var(--ns-on-surface)] shadow-sm transition active:scale-[0.98] hover:border-[color-mix(in_srgb,var(--ns-primary)_40%,transparent)]"
          >
            <Barcode size={22} className="text-ns-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">
              {t('barcode')}
            </span>
          </button>

          <button
            type="button"
            onClick={openGallery}
            className="group flex min-h-[64px] items-center justify-center gap-2.5 rounded-2xl border border-[var(--ns-border-light)] bg-[var(--ns-card-bg)] px-3 text-[var(--ns-on-surface)] shadow-sm transition active:scale-[0.98] hover:border-[color-mix(in_srgb,var(--ns-primary)_40%,transparent)]"
          >
            <ImageIcon size={22} className="text-ns-primary" />
            <span className="text-xs font-bold uppercase tracking-widest">
              {t('gallery')}
            </span>
          </button>
        </div>
      </footer>
    </div>
  );
}
