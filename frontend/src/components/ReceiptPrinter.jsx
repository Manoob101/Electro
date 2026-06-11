import { forwardRef } from 'react';
import { format } from 'date-fns';

const ReceiptPrinter = forwardRef(({ sale }, ref) => {
  const shop = {
    name: localStorage.getItem('shopName') || 'ElectroPOS',
    address: localStorage.getItem('shopAddress') || '',
    phone: localStorage.getItem('shopPhone') || '',
    gst: localStorage.getItem('shopGST') || '',
  };

  if (!sale) return null;

  const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

  return (
    <div ref={ref} className="receipt-print hidden print:block bg-white p-4" style={{ width: '80mm', fontFamily: "'Courier New', monospace", fontSize: '12px' }}>
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{shop.name}</div>
        {shop.address && <div>{shop.address}</div>}
        {shop.phone && <div>Ph: {shop.phone}</div>}
        {shop.gst && <div>GST: {shop.gst}</div>}
      </div>

      <div style={{ borderTop: '1px dashed #000', borderBottom: '1px dashed #000', padding: '6px 0', margin: '6px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Invoice: {sale.invoiceNo}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Date: {format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm')}</span>
        </div>
        {sale.customer && <div>Customer: {sale.customer.name}</div>}
        {sale.customer?.phone && <div>Phone: {sale.customer.phone}</div>}
        <div>Cashier: {sale.user?.name}</div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '8px' }}>
        <thead>
          <tr style={{ borderBottom: '1px dashed #000' }}>
            <th style={{ textAlign: 'left', paddingBottom: '4px', fontWeight: 'normal' }}>Item</th>
            <th style={{ textAlign: 'center', paddingBottom: '4px', fontWeight: 'normal' }}>Qty</th>
            <th style={{ textAlign: 'right', paddingBottom: '4px', fontWeight: 'normal' }}>Amt</th>
          </tr>
        </thead>
        <tbody>
          {sale.items?.map((item, i) => (
            <tr key={i}>
              <td style={{ paddingTop: '3px', paddingBottom: '1px', fontSize: '11px' }}>
                {item.product?.name}
                {item.serialNumber && <div style={{ fontSize: '10px', color: '#666' }}>S/N: {item.serialNumber}</div>}
                {item.warrantyMonths > 0 && <div style={{ fontSize: '10px', color: '#666' }}>Warranty: {item.warrantyMonths}m</div>}
              </td>
              <td style={{ textAlign: 'center', paddingTop: '3px' }}>x{item.quantity}</td>
              <td style={{ textAlign: 'right', paddingTop: '3px' }}>{fmt(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '1px dashed #000', paddingTop: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Subtotal</span><span>{fmt(sale.subtotal)}</span>
        </div>
        {sale.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Discount</span><span>- {fmt(sale.discount)}</span>
          </div>
        )}
        {sale.tax > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Tax</span><span>{fmt(sale.tax)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '14px', marginTop: '4px', borderTop: '1px solid #000', paddingTop: '4px' }}>
          <span>TOTAL</span><span>{fmt(sale.total)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px' }}>
          <span>Payment</span><span style={{ textTransform: 'capitalize' }}>{sale.paymentMethod}</span>
        </div>
      </div>

      {sale.items?.some((i) => i.warrantyMonths > 0) && (
        <div style={{ borderTop: '1px dashed #000', marginTop: '8px', paddingTop: '6px', fontSize: '10px' }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>WARRANTY DETAILS</div>
          {sale.items?.filter((i) => i.warrantyMonths > 0).map((item, idx) => (
            <div key={idx} style={{ marginBottom: '3px' }}>
              <div>{item.product?.name}</div>
              {item.serialNumber && <div>S/N: {item.serialNumber}</div>}
              <div>Valid: {item.warranty ? format(new Date(item.warranty.endDate), 'dd/MM/yyyy') : `${item.warrantyMonths} months from purchase`}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '11px', borderTop: '1px dashed #000', paddingTop: '8px' }}>
        <div>Thank you for shopping with us!</div>
        <div>Visit again</div>
        {shop.gst && <div style={{ marginTop: '4px' }}>This is a valid tax invoice</div>}
      </div>
    </div>
  );
});

ReceiptPrinter.displayName = 'ReceiptPrinter';

export default ReceiptPrinter;
