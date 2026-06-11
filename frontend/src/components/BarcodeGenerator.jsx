import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { Printer } from 'lucide-react';

export default function BarcodeGenerator({ value, productName, price, showPrint = true }) {
  const svgRef = useRef(null);
  const shopName = localStorage.getItem('shopName') || 'ElectroPOS';

  useEffect(() => {
    if (!value || !svgRef.current) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        lineColor: '#000',
        width: 2,
        height: 50,
        displayValue: true,
        fontSize: 12,
        margin: 8,
      });
    } catch (e) {
      console.error('Barcode generation error', e);
    }
  }, [value]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=400,height=300');
    const svgContent = svgRef.current?.outerHTML || '';
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Barcode Label</title>
          <style>
            body { margin: 0; padding: 8px; font-family: monospace; display: inline-block; }
            .label { text-align: center; border: 1px dashed #ccc; padding: 8px 12px; display: inline-block; }
            .shop { font-size: 10px; font-weight: bold; margin-bottom: 2px; }
            .name { font-size: 11px; margin-bottom: 4px; max-width: 200px; word-wrap: break-word; }
            .price { font-size: 14px; font-weight: bold; margin-top: 4px; }
            svg { display: block; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="shop">${shopName}</div>
            <div class="name">${productName || ''}</div>
            ${svgContent}
            ${price !== undefined ? `<div class="price">₹${Number(price).toFixed(2)}</div>` : ''}
          </div>
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!value) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg ref={svgRef} />
      {showPrint && (
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <Printer size={14} />
          Print Label
        </button>
      )}
    </div>
  );
}
