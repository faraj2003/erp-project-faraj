import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function ItemLabel({ item }) {
  if (!item) return null;

  return (
    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg max-w-xs flex flex-col items-center justify-center bg-white">
      {/* The QR Code contains the exact SKU string the scanner will read */}
      <QRCodeSVG value={item.sku} size={150} level={"H"} />
      
      <div className="mt-4 text-center">
        <p className="text-xl font-bold text-gray-900">{item.sku}</p>
        <p className="text-sm font-medium text-gray-500 truncate w-48">{item.name}</p>
      </div>
      
      <button 
        onClick={() => window.print()} 
        className="mt-4 text-xs bg-gray-100 px-3 py-1 rounded hover:bg-gray-200 transition"
      >
        Print Label
      </button>
    </div>
  );
}