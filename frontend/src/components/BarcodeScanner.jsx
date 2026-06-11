import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException } from '@zxing/library';
import { X, Camera, Keyboard } from 'lucide-react';

export default function BarcodeScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const readerRef = useRef(null);
  const [manualInput, setManualInput] = useState('');
  const [mode, setMode] = useState('camera'); // camera | manual
  const [error, setError] = useState('');

  useEffect(() => {
    if (mode !== 'camera') return;

    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;

    reader.decodeFromVideoDevice(undefined, videoRef.current, (result, err) => {
      if (result) {
        onScan(result.getText());
      }
      if (err && !(err instanceof NotFoundException)) {
        setError('Camera error. Try manual entry.');
      }
    }).catch(() => {
      setError('Camera access denied. Use manual entry.');
      setMode('manual');
    });

    return () => {
      try { reader.reset(); } catch (_) {}
    };
  }, [mode, onScan]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      onScan(manualInput.trim());
      setManualInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Barcode Scanner</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode(mode === 'camera' ? 'manual' : 'camera')}
              className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title={mode === 'camera' ? 'Switch to manual' : 'Switch to camera'}
            >
              {mode === 'camera' ? <Keyboard size={18} /> : <Camera size={18} />}
            </button>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5">
          {mode === 'camera' ? (
            <div>
              {error ? (
                <div className="text-center py-8 text-red-500 text-sm">{error}</div>
              ) : (
                <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
                  <video ref={videoRef} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-48 h-32 border-2 border-primary-400 rounded-lg opacity-70" />
                  </div>
                </div>
              )}
              <p className="text-center text-gray-500 text-sm mt-3">Point camera at a barcode</p>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">Enter barcode manually</label>
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="input-field text-lg font-mono tracking-widest"
                placeholder="Scan or type barcode..."
                autoFocus
              />
              <button type="submit" className="btn-primary w-full">
                Look Up Product
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
