import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ArrowLeft, Barcode, ShieldCheck } from 'lucide-react';

export default function BarcodeScanner({ onScan, onBack }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 },
      false
    );

    scanner.render(
      (decodedText) => {
        scanner.clear();
        onScan(decodedText);
      },
      (err) => {
        // Silently handle scan errors
      }
    );

    return () => {
      scanner.clear().catch(error => console.error("Failed to clear html5QrcodeScanner. ", error));
    };
  }, [onScan]);

  return (
    <div className="barcode-page animate-fade-in-up">
      <section className="barcode-shell" aria-label="Barcode scanner">
        <header className="barcode-header">
          <button onClick={onBack} aria-label="Back to scanner">
            <ArrowLeft size={20} />
          </button>
          <h1>Scanner</h1>
          <span />
        </header>

        <div className="barcode-copy">
          <h2>Barcode Scan</h2>
          <p>Align the code within the frame</p>
        </div>

        <div className="barcode-reader-card">
          <div id="reader" className="barcode-reader" />
        </div>

        <div className="barcode-info-card">
          <div>
            <Barcode size={20} />
          </div>
          <span>
            <strong>Instant Fetch</strong>
            <p>We sync with Open Food Facts to pull real-time data.</p>
          </span>
        </div>

        <footer className="barcode-footer">
          <ShieldCheck size={14} />
          <span>Powered by bitezsnap AI</span>
        </footer>
      </section>
    </div>
  );
}
