// client/src/components/BarcodeScanner.jsx
import React, { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const BarcodeScanner = ({ onScanSuccess, onClose }) => {
  useEffect(() => {
    // Initialize the scanner
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true
      },
      false // verbose logging
    );

    // Start rendering the camera
    scanner.render(
      (decodedText) => {
        // Stop scanning once we get a successful read
        scanner.clear();
        onScanSuccess(decodedText);
      },
      (errorMessage) => {
        // We ignore errors here because the scanner throws an "error" 
        // every single frame it doesn't immediately see a barcode.
      }
    );

    // Cleanup when the component unmounts (modal closed)
    return () => {
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };
  }, [onScanSuccess]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Scan Barcode / QR</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-3xl font-bold">&times;</button>
        </div>
        
        {/* The scanner will inject the video feed into this div */}
        <div id="reader" className="w-full rounded overflow-hidden"></div>
        
        <p className="mt-4 text-sm text-gray-500 text-center font-medium">
          Point your camera at the item's SKU barcode.
        </p>
      </div>
    </div>
  );
};

export default BarcodeScanner;