import { useState, useRef, useCallback } from 'react';
import { Search, ScanBarcode, Plus, Minus, Trash2, UserPlus, Printer, CheckCircle, X, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import api from '../services/api';
import BarcodeScanner from '../components/BarcodeScanner';
import ReceiptPrinter from '../components/ReceiptPrinter';

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function POS() {
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [cashReceived, setCashReceived] = useState('');
  const [notes, setNotes] = useState('');
  const [customer, setCustomer] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [showCustomerDrop, setShowCustomerDrop] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const receiptRef = useRef(null);

  const handlePrint = useReactToPrint({ contentRef: receiptRef });

  const searchProducts = useDebounce(async (term) => {
    if (!term.trim()) { setProducts([]); return; }
    try {
      const res = await api.get('/products', { params: { search: term } });
      setProducts(res.data.slice(0, 12));
    } catch { toast.error('Search failed'); }
  }, 300);

  const handleBarcodeScanned = async (barcode) => {
    setShowScanner(false);
    try {
      const res = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`);
      addToCart(res.data);
    } catch {
      toast.error(`No product found for barcode: ${barcode}`);
    }
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) { toast.error('Insufficient stock'); return prev; }
        return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (product.stock === 0) { toast.error('Out of stock'); return prev; }
      return [...prev, {
        productId: product.id,
        product,
        quantity: 1,
        unitPrice: product.price,
        discount: 0,
        warrantyMonths: product.warrantyMonths,
        serialNumber: '',
      }];
    });
    toast.success(`${product.name} added`);
  };

  const updateQty = (productId, delta) => {
    setCart((prev) => prev.map((i) => {
      if (i.productId !== productId) return i;
      const newQty = i.quantity + delta;
      if (newQty <= 0) return null;
      if (newQty > i.product.stock) { toast.error('Insufficient stock'); return i; }
      return { ...i, quantity: newQty };
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => setCart((prev) => prev.filter((i) => i.productId !== productId));

  const updateItemField = (productId, field, value) => {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, [field]: value } : i));
  };

  const subtotal = cart.reduce((sum, i) => sum + i.unitPrice * i.quantity - (i.discount || 0), 0);
  const total = Math.max(0, subtotal - parseFloat(discount || 0) + parseFloat(tax || 0));
  const change = cashReceived ? parseFloat(cashReceived) - total : 0;

  const searchCustomers = useDebounce(async (term) => {
    if (!term.trim()) { setCustomerResults([]); return; }
    try {
      const res = await api.get('/customers', { params: { search: term } });
      setCustomerResults(res.data);
    } catch { }
  }, 300);

  const createQuickCustomer = async () => {
    const name = customerSearch.trim();
    if (!name) return;
    try {
      const res = await api.post('/customers', { name });
      setCustomer(res.data);
      setCustomerSearch(res.data.name);
      setShowCustomerDrop(false);
      toast.success('Customer created');
    } catch { toast.error('Failed to create customer'); }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    setProcessing(true);
    try {
      const res = await api.post('/sales', {
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount || 0,
          warrantyMonths: i.warrantyMonths,
          serialNumber: i.serialNumber || null,
        })),
        customerId: customer?.id || null,
        discount: parseFloat(discount || 0),
        tax: parseFloat(tax || 0),
        paymentMethod,
        paymentStatus,
        notes,
      });
      setCompletedSale(res.data);
      setShowReceipt(true);
      setCart([]);
      setDiscount(0);
      setTax(0);
      setCustomer(null);
      setCustomerSearch('');
      setCashReceived('');
      setNotes('');
      setSearchTerm('');
      setProducts([]);
      toast.success(`Sale ${res.data.invoiceNo} completed!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  };

  const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full min-h-0">
      {/* Left: Product Search */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Point of Sale</h1>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); searchProducts(e.target.value); }}
              className="input-field pl-10"
              placeholder="Search products by name, SKU or barcode..."
            />
          </div>
          <button
            onClick={() => setShowScanner(true)}
            className="btn-secondary flex items-center gap-2 whitespace-nowrap"
          >
            <ScanBarcode size={16} /> Scan
          </button>
        </div>

        {/* Product results */}
        {products.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {products.map((p) => (
              <button
                key={p.id}
                onClick={() => addToCart(p)}
                disabled={p.stock === 0}
                className="text-left p-3 bg-white border border-gray-200 rounded-xl hover:border-primary-400 hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <p className="font-medium text-gray-800 text-sm truncate">{p.name}</p>
                <p className="text-xs text-gray-500 truncate">{p.category?.name || 'Uncategorized'}</p>
                <p className="text-primary-600 font-bold text-sm mt-1">{fmt(p.price)}</p>
                <p className={`text-xs mt-0.5 ${p.stock === 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {p.stock === 0 ? 'Out of stock' : `${p.stock} in stock`}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Cart */}
        <div className="card flex-1">
          <h3 className="font-semibold text-gray-800 mb-3">Cart ({cart.length} items)</h3>
          {cart.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <ShoppingCartEmpty />
              <p className="mt-2 text-sm">Search products or scan a barcode to add items</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.productId} className="flex flex-col sm:flex-row sm:items-start gap-2 p-3 bg-gray-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{item.product.name}</p>
                    <p className="text-xs text-gray-500">{fmt(item.unitPrice)} each{item.warrantyMonths > 0 ? ` · ${item.warrantyMonths}m warranty` : ''}</p>
                    <input
                      type="text"
                      value={item.serialNumber}
                      onChange={(e) => updateItemField(item.productId, 'serialNumber', e.target.value)}
                      className="mt-1.5 w-full text-xs px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-400"
                      placeholder="Serial number (optional)"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => updateQty(item.productId, -1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                        <Minus size={12} />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button onClick={() => updateQty(item.productId, 1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100">
                        <Plus size={12} />
                      </button>
                    </div>
                    <span className="text-sm font-bold text-gray-800 w-20 text-right">{fmt(item.unitPrice * item.quantity)}</span>
                    <button onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Checkout Panel */}
      <div className="w-full lg:w-80 xl:w-96 flex flex-col gap-4">
        {/* Customer */}
        <div className="card">
          <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
          <div className="relative">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDrop(true);
                  searchCustomers(e.target.value);
                  if (!e.target.value) setCustomer(null);
                }}
                onFocus={() => setShowCustomerDrop(true)}
                className="input-field pl-8 pr-8 text-sm"
                placeholder="Search or type new customer name..."
              />
              {customer && <CheckCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />}
            </div>
            {showCustomerDrop && customerSearch.trim() && (
              <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 overflow-hidden">
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 text-sm"
                    onClick={() => { setCustomer(c); setCustomerSearch(c.name); setShowCustomerDrop(false); }}
                  >
                    <p className="font-medium">{c.name}</p>
                    {c.phone && <p className="text-xs text-gray-500">{c.phone}</p>}
                  </button>
                ))}
                <button
                  className="w-full text-left px-3 py-2.5 hover:bg-primary-50 text-sm text-primary-600 font-medium border-t border-gray-100 flex items-center gap-2"
                  onClick={createQuickCustomer}
                >
                  <UserPlus size={14} /> Create "{customerSearch}"
                </button>
              </div>
            )}
          </div>
          {showCustomerDrop && <div className="fixed inset-0 z-0" onClick={() => setShowCustomerDrop(false)} />}
        </div>

        {/* Totals */}
        <div className="card space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium">{fmt(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-gray-600 whitespace-nowrap">Discount (₹)</label>
            <input
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="w-28 text-right px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
              min="0"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm text-gray-600 whitespace-nowrap">Tax (₹)</label>
            <input
              type="number"
              value={tax}
              onChange={(e) => setTax(e.target.value)}
              className="w-28 text-right px-2 py-1 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary-400"
              min="0"
            />
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-gray-100 pt-3">
            <span>Total</span>
            <span className="text-primary-700">{fmt(total)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="card space-y-3">
          <label className="block text-sm font-medium text-gray-700">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            {['cash', 'card', 'upi', 'bank_transfer'].map((m) => (
              <button
                key={m}
                onClick={() => setPaymentMethod(m)}
                className={`py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                  paymentMethod === m
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400'
                }`}
              >
                {m.replace('_', ' ')}
              </button>
            ))}
          </div>

          {paymentMethod === 'cash' && (
            <>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Cash Received</label>
                <input
                  type="number"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  className="input-field text-right"
                  placeholder="0.00"
                  min="0"
                />
              </div>
              {cashReceived && (
                <div className={`flex justify-between text-sm font-semibold ${change < 0 ? 'text-red-600' : 'text-green-600'}`}>
                  <span>{change < 0 ? 'Short by' : 'Change'}</span>
                  <span>{fmt(Math.abs(change))}</span>
                </div>
              )}
            </>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input-field text-sm resize-none"
              rows={2}
              placeholder="Order notes..."
            />
          </div>
        </div>

        <button
          onClick={handleCheckout}
          disabled={cart.length === 0 || processing}
          className="btn-primary py-3 text-base w-full flex items-center justify-center gap-2"
        >
          {processing ? 'Processing...' : `Complete Sale · ${fmt(total)}`}
        </button>
      </div>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner onScan={handleBarcodeScanned} onClose={() => setShowScanner(false)} />
      )}

      {/* Receipt Modal */}
      {showReceipt && completedSale && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle size={20} />
                <span className="font-semibold">Sale Complete!</span>
              </div>
              <button onClick={() => setShowReceipt(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-center">
                <p className="text-gray-500 text-sm">Invoice</p>
                <p className="text-xl font-bold font-mono text-primary-700">{completedSale.invoiceNo}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  ₹{Number(completedSale.total).toFixed(2)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePrint()}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  <Printer size={16} /> Print Receipt
                </button>
                <button onClick={() => setShowReceipt(false)} className="btn-secondary flex-1">
                  New Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden receipt for printing */}
      <div className="hidden">
        <ReceiptPrinter ref={receiptRef} sale={completedSale} />
      </div>
    </div>
  );
}

function ShoppingCartEmpty() {
  return (
    <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
