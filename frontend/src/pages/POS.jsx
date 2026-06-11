import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, ScanBarcode, Trash2, UserPlus, Printer,
  CheckCircle, X, Delete, ChevronDown, ChevronUp, Phone, Mail, MapPin, User,
} from 'lucide-react';
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

const PAY_METHODS = [
  { id: 'cash',          label: 'Cash',   emoji: '💵' },
  { id: 'card',          label: 'Card',   emoji: '💳' },
  { id: 'bank_transfer', label: 'Bank',   emoji: '🏦' },
  { id: 'upi',           label: 'QR/UPI', emoji: '📱' },
];

const QUICK_CASH = [500, 1000, 2000, 5000];

// ── Inline numpad (always visible) ────────────────────────────────────────────
function Numpad({ value, onChange }) {
  const press = (k) => {
    if (k === 'C')  { onChange('0'); return; }
    if (k === '⌫')  { onChange(value.length > 1 ? value.slice(0, -1) : '0'); return; }
    if (k === '.' && value.includes('.')) return;
    onChange(value === '0' && k !== '.' ? k : value + k);
  };
  const keys = ['7','8','9','4','5','6','1','2','3','C','0','.','⌫'];
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {keys.map((k) => (
        <button
          key={k}
          onPointerDown={() => press(k)}
          className={`h-10 rounded-xl text-base font-bold select-none transition-all active:scale-90 ${
            k === 'C'  ? 'bg-amber-100 text-amber-700 active:bg-amber-200' :
            k === '⌫' ? 'bg-red-100 text-red-600 active:bg-red-200' :
            'bg-gray-100 text-gray-900 active:bg-gray-200'
          }`}
        >
          {k === '⌫' ? <Delete size={16} className="mx-auto" /> : k}
        </button>
      ))}
    </div>
  );
}

// ── Main POS ──────────────────────────────────────────────────────────────────
export default function POS() {
  const [categories,   setCategories]   = useState([]);
  const [allProducts,  setAllProducts]  = useState([]);
  const [activeCat,    setActiveCat]    = useState('all');
  const [searchTerm,   setSearchTerm]   = useState('');
  const [showScanner,  setShowScanner]  = useState(false);

  const [cart,         setCart]         = useState([]);

  const [discount,     setDiscount]     = useState('0');
  const [payMethod,    setPayMethod]    = useState('cash');
  const [cashReceived, setCashReceived] = useState('0');
  const [numpadMode,   setNumpadMode]   = useState('cash'); // 'cash' | 'discount'

  const [customer,     setCustomer]     = useState(null);
  const [showCustModal, setShowCustModal] = useState(false);

  const [processing,   setProcessing]   = useState(false);
  const [doneSale,     setDoneSale]     = useState(null);
  const [doneCash,     setDoneCash]     = useState(0);
  const [showReceipt,  setShowReceipt]  = useState(false);

  const receiptRef = useRef(null);
  const handlePrint = useReactToPrint({ contentRef: receiptRef });

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
    api.get('/products').then((r) => setAllProducts(r.data)).catch(() => {});
  }, []);

  const filtered = allProducts.filter((p) => {
    const matchCat = activeCat === 'all' || p.categoryId === activeCat;
    const q = searchTerm.trim().toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q) || (p.barcode || '').includes(q);
    return matchCat && matchQ;
  });

  const handleBarcodeScanned = async (barcode) => {
    setShowScanner(false);
    try { const r = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`); addToCart(r.data); }
    catch { toast.error(`No product for barcode: ${barcode}`); }
  };

  const addToCart = (p) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.productId === p.id);
      if (ex) {
        if (ex.quantity >= p.stock) { toast.error('Insufficient stock'); return prev; }
        return prev.map((i) => i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      if (p.stock === 0) { toast.error('Out of stock'); return prev; }
      return [...prev, { productId: p.id, product: p, quantity: 1, unitPrice: p.price, warrantyMonths: p.warrantyMonths, serialNumber: '' }];
    });
  };

  const updateQty = (id, d) => setCart((prev) =>
    prev.map((i) => {
      if (i.productId !== id) return i;
      const q = i.quantity + d;
      if (q <= 0) return null;
      if (q > i.product.stock) { toast.error('Insufficient stock'); return i; }
      return { ...i, quantity: q };
    }).filter(Boolean)
  );

  const removeFromCart = (id) => setCart((p) => p.filter((i) => i.productId !== id));

  const subtotal    = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const discountVal = Math.max(0, parseFloat(discount || 0));
  const total       = Math.max(0, subtotal - discountVal);
  const cashVal     = parseFloat(cashReceived || 0);
  const change      = cashVal - total;

  const handleCheckout = async () => {
    if (!cart.length) { toast.error('Cart is empty'); return; }
    if (payMethod === 'cash' && cashVal < total) { toast.error('Cash received is less than total'); return; }
    setProcessing(true);
    try {
      const r = await api.post('/sales', {
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice, discount: 0, warrantyMonths: i.warrantyMonths, serialNumber: i.serialNumber || null })),
        customerId: customer?.id || null,
        discount: discountVal, tax: 0, paymentMethod: payMethod, paymentStatus: 'paid', notes: '',
      });
      setDoneSale(r.data); setDoneCash(cashVal); setShowReceipt(true);
      setCart([]); setDiscount('0'); setCashReceived('0');
      setCustomer(null); setCustSearch('');
      toast.success(`Sale ${r.data.invoiceNo} completed!`);
    } catch (err) { toast.error(err.response?.data?.error || 'Checkout failed'); }
    finally { setProcessing(false); }
  };

  const fmt = (n) => `LKR ${Number(n || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}`;
  const numpadValue   = numpadMode === 'cash' ? cashReceived : discount;
  const numpadChange  = numpadMode === 'cash' ? setCashReceived : setDiscount;

  return (
    <div className="flex h-full overflow-hidden bg-gray-100">

      {/* ── LEFT: product browser ─────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">

        {/* search + scan */}
        <div className="flex gap-2 px-3 pt-3 pb-2 bg-white border-b border-gray-200 shrink-0">
          <div className="relative flex-1">
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text" value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="Search products…"
            />
          </div>
          <button
            onPointerDown={() => setShowScanner(true)}
            className="px-4 py-2.5 bg-indigo-600 active:bg-indigo-700 text-white rounded-xl flex items-center gap-2 text-sm font-semibold shrink-0 transition-all active:scale-95"
          >
            <ScanBarcode size={18} /><span className="hidden sm:inline">Scan</span>
          </button>
        </div>

        {/* category pills */}
        <div className="flex gap-2 px-3 py-2 bg-white border-b border-gray-200 overflow-x-auto shrink-0" style={{ scrollbarWidth: 'none' }}>
          {[{ id: 'all', name: 'All' }, ...categories].map((c) => (
            <button
              key={c.id}
              onPointerDown={() => setActiveCat(c.id)}
              className={`px-4 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 transition-all active:scale-95 ${
                activeCat === c.id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* product grid */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3">
          {filtered.length === 0
            ? <div className="flex items-center justify-center h-32 text-sm text-gray-300">No products found</div>
            : (
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {filtered.map((p) => <ProductCard key={p.id} product={p} onAdd={addToCart} fmt={fmt} />)}
              </div>
            )
          }
        </div>
      </div>

      {/* ── RIGHT: cart + payment ─────────────────────────────────── */}
      <div className="w-[340px] xl:w-[380px] flex flex-col shrink-0 bg-white border-l border-gray-200 overflow-hidden">

        {/* cart header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 shrink-0">
          <span className="font-bold text-gray-800 text-sm">
            Cart {cart.length > 0 && <span className="text-indigo-600">({cart.length})</span>}
          </span>
          {cart.length > 0 && (
            <button onPointerDown={() => { setCart([]); setDiscount('0'); setCashReceived('0'); }} className="text-xs text-red-400 active:text-red-600 font-medium">
              Clear
            </button>
          )}
        </div>

        {/* cart items — scrolls internally */}
        <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1.5">
          {cart.length === 0
            ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300">
                <CartIcon />
                <p className="text-sm mt-1">Tap a product to add</p>
              </div>
            )
            : cart.map((item) => (
              <CartItem key={item.productId} item={item} onQty={updateQty} onRemove={removeFromCart} fmt={fmt} />
            ))
          }
        </div>

        {/* ── fixed bottom: everything that never scrolls ── */}
        <div className="shrink-0 border-t border-gray-100 bg-white">

          {/* customer row — opens modal */}
          <button
            onPointerDown={() => setShowCustModal(true)}
            className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 active:bg-gray-50 transition-colors"
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${customer ? 'bg-indigo-100' : 'bg-gray-100'}`}>
              <User size={14} className={customer ? 'text-indigo-600' : 'text-gray-400'} />
            </div>
            <div className="flex-1 text-left min-w-0">
              {customer ? (
                <>
                  <p className="text-sm font-semibold text-gray-800 truncate">{customer.name}</p>
                  <p className="text-xs text-gray-400 truncate">{[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact info'}</p>
                </>
              ) : (
                <p className="text-sm text-gray-400">Add customer (optional)</p>
              )}
            </div>
            {customer
              ? <button onPointerDown={(e) => { e.stopPropagation(); setCustomer(null); }} className="text-gray-300 active:text-red-400 p-1"><X size={14} /></button>
              : <ChevronDown size={14} className="text-gray-400 shrink-0" />
            }
          </button>

          {/* totals row */}
          <div className="px-4 py-2 flex items-center justify-between gap-4 border-b border-gray-100">
            <div className="text-xs text-gray-500 space-y-0.5">
              <div className="flex gap-3">
                <span>Subtotal</span>
                <span className="text-gray-700 font-medium">{fmt(subtotal)}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex gap-3 text-indigo-600">
                  <span>Discount</span>
                  <span className="font-medium">− {fmt(discountVal)}</span>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-xl font-bold text-indigo-700 leading-tight">{fmt(total)}</p>
            </div>
          </div>

          {/* payment methods */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="grid grid-cols-4 gap-1.5">
              {PAY_METHODS.map((m) => (
                <button
                  key={m.id}
                  onPointerDown={() => { setPayMethod(m.id); if (m.id === 'cash') setNumpadMode('cash'); }}
                  className={`py-1.5 rounded-xl text-xs font-semibold flex flex-col items-center gap-0.5 transition-all active:scale-95 border ${
                    payMethod === m.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 active:bg-gray-50'
                  }`}
                >
                  <span className="text-sm">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* numpad section */}
          <div className="px-3 py-2 border-b border-gray-100">

            {/* mode tabs: Cash / Discount */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-2">
              {payMethod === 'cash' && (
                <button
                  onPointerDown={() => setNumpadMode('cash')}
                  className={`flex-1 py-1.5 text-xs font-bold transition-colors ${
                    numpadMode === 'cash' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 active:bg-gray-50'
                  }`}
                >
                  💵 Cash
                </button>
              )}
              <button
                onPointerDown={() => setNumpadMode('discount')}
                className={`flex-1 py-1.5 text-xs font-bold transition-colors ${
                  numpadMode === 'discount' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 active:bg-gray-50'
                }`}
              >
                % Discount
              </button>
            </div>

            {/* display */}
            <div className="bg-gray-900 rounded-xl px-4 py-2.5 mb-2 text-right">
              <p className="text-xs text-gray-400 mb-0.5">{numpadMode === 'cash' ? 'Cash Received' : 'Discount Amount'}</p>
              <p className="text-2xl font-bold text-white tracking-wide">
                LKR {Number(numpadValue || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
              </p>
            </div>

            {/* quick cash buttons */}
            {numpadMode === 'cash' && (
              <div className="grid grid-cols-4 gap-1 mb-2">
                {QUICK_CASH.map((a) => (
                  <button
                    key={a}
                    onPointerDown={() => setCashReceived(String(a))}
                    className="py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold active:bg-indigo-100 transition-all active:scale-95"
                  >
                    {a >= 1000 ? `${a / 1000}K` : a}
                  </button>
                ))}
              </div>
            )}

            {/* numpad grid */}
            <Numpad value={numpadValue} onChange={numpadChange} />

            {/* change / short display */}
            {numpadMode === 'cash' && cashVal > 0 && (
              <div className={`mt-2 flex justify-between px-3 py-1.5 rounded-xl text-sm font-bold ${
                change >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}>
                <span>{change >= 0 ? 'Change' : 'Short by'}</span>
                <span>{fmt(Math.abs(change))}</span>
              </div>
            )}
          </div>

          {/* checkout button */}
          <div className="px-3 py-3">
            <button
              onPointerDown={handleCheckout}
              disabled={cart.length === 0 || processing}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 active:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-indigo-200"
            >
              {processing
                ? <span className="animate-pulse">Processing…</span>
                : <><CheckCircle size={20} /><span>Charge {cart.length > 0 ? fmt(total) : ''}</span></>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Customer modal ── */}
      {showCustModal && (
        <CustomerModal
          current={customer}
          onSelect={(c) => { setCustomer(c); setShowCustModal(false); }}
          onClose={() => setShowCustModal(false)}
        />
      )}

      {/* ── Barcode scanner ── */}
      {showScanner && <BarcodeScanner onScan={handleBarcodeScanned} onClose={() => setShowScanner(false)} />}

      {/* ── Receipt modal ── */}
      {showReceipt && doneSale && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* success header */}
            <div className="bg-green-500 px-6 py-5 text-white text-center">
              <CheckCircle size={40} className="mx-auto mb-2" />
              <p className="font-bold text-xl">Sale Complete!</p>
              <p className="text-green-100 text-sm font-mono mt-1">{doneSale.invoiceNo}</p>
            </div>

            {/* summary */}
            <div className="px-6 pt-5 pb-3 space-y-2">
              {doneSale.customer && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Customer</span>
                  <span className="font-medium text-gray-800">{doneSale.customer.name}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Items</span>
                <span className="font-medium text-gray-800">{doneSale.items?.length}</span>
              </div>
              {doneSale.discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Discount</span>
                  <span className="font-medium text-indigo-600">− {fmt(doneSale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payment</span>
                <span className="font-medium text-gray-800 capitalize">{doneSale.paymentMethod.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between items-center border-t border-gray-100 pt-2 mt-2">
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-2xl text-indigo-700">{fmt(doneSale.total)}</span>
              </div>
              {doneSale.paymentMethod === 'cash' && doneCash > 0 && (
                <div className={`flex justify-between px-4 py-2 rounded-xl text-sm font-bold ${
                  doneCash - doneSale.total >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}>
                  <span>Change</span>
                  <span>{fmt(Math.max(0, doneCash - doneSale.total))}</span>
                </div>
              )}
            </div>

            {/* item list */}
            <div className="mx-6 mb-4 bg-gray-50 rounded-xl p-3 max-h-32 overflow-y-auto">
              {doneSale.items?.map((item, i) => (
                <div key={i} className="flex justify-between text-xs py-0.5">
                  <span className="text-gray-600 truncate flex-1 mr-2">{item.product?.name} × {item.quantity}</span>
                  <span className="font-medium text-gray-800 shrink-0">{fmt(item.total)}</span>
                </div>
              ))}
            </div>

            {/* actions */}
            <div className="px-6 pb-6 space-y-2">
              <button
                onPointerDown={() => handlePrint()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-indigo-600 active:bg-indigo-700 text-white font-bold text-base transition-all active:scale-95 shadow-md shadow-indigo-200"
              >
                <Printer size={20} /> Print Bill
              </button>
              <button
                onPointerDown={() => setShowReceipt(false)}
                className="w-full py-3 rounded-2xl bg-gray-100 active:bg-gray-200 text-gray-700 font-semibold text-sm transition-all active:scale-95"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="hidden">
        <ReceiptPrinter ref={receiptRef} sale={doneSale} />
      </div>
    </div>
  );
}

// ── Customer modal ────────────────────────────────────────────────────────────
function CustomerModal({ current, onSelect, onClose }) {
  const [tab,     setTab]     = useState('search'); // 'search' | 'new'
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [form,    setForm]    = useState({ name: '', phone: '', email: '', address: '' });
  const [saving,  setSaving]  = useState(false);

  const searchCusts = useDebounce(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    try { const r = await api.get('/customers', { params: { search: q } }); setResults(r.data); } catch {}
  }, 300);

  const handleQueryChange = (v) => { setQuery(v); searchCusts(v); };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      const r = await api.post('/customers', {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
      });
      toast.success('Customer created');
      onSelect(r.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create customer');
    } finally { setSaving(false); }
  };

  const field = (icon, placeholder, key, type = 'text') => (
    <div className="relative">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</div>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full pl-9 pr-3 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onPointerDown={onClose}>
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">Customer</h2>
          <button onPointerDown={onClose} className="text-gray-400 active:text-gray-600 p-1"><X size={20} /></button>
        </div>

        {/* tabs */}
        <div className="flex border-b border-gray-100">
          {[['search','Search'], ['new','New Customer']].map(([id, label]) => (
            <button
              key={id}
              onPointerDown={() => setTab(id)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === id ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 active:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {tab === 'search' ? (
            <>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text" value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  autoFocus
                  placeholder="Search by name, phone or email…"
                  className="w-full pl-9 pr-3 py-3 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>

              {/* walk-in option */}
              {current && (
                <button
                  onPointerDown={() => onSelect(null)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 active:bg-gray-50 text-sm text-gray-500"
                >
                  <X size={16} /> Remove customer (Walk-in)
                </button>
              )}

              {results.length > 0 && (
                <div className="space-y-1.5">
                  {results.map((c) => (
                    <button
                      key={c.id}
                      onPointerDown={() => onSelect(c)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all active:scale-98 ${
                        current?.id === c.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 active:bg-gray-50'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                        <span className="text-indigo-600 font-bold text-sm">{c.name[0].toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-800 text-sm">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate">{[c.phone, c.email].filter(Boolean).join(' · ') || 'No contact info'}</p>
                      </div>
                      {current?.id === c.id && <CheckCircle size={16} className="text-indigo-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {query.trim() && results.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">
                  No customers found.{' '}
                  <button onPointerDown={() => { setTab('new'); setForm((f) => ({ ...f, name: query })); }} className="text-indigo-600 font-medium">
                    Create new?
                  </button>
                </div>
              )}

              {!query.trim() && (
                <p className="text-center text-gray-300 text-sm py-4">Type to search existing customers</p>
              )}
            </>
          ) : (
            <>
              {field(<User size={15} />, 'Full name *', 'name')}
              {field(<Phone size={15} />, 'Phone number', 'phone', 'tel')}
              {field(<Mail size={15} />, 'Email address', 'email', 'email')}
              {field(<MapPin size={15} />, 'Address', 'address')}

              <button
                onPointerDown={handleSave}
                disabled={saving || !form.name.trim()}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 active:bg-indigo-700 disabled:opacity-40 text-white font-bold text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {saving ? 'Saving…' : <><UserPlus size={16} /> Save Customer</>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────
function ProductCard({ product: p, onAdd, fmt }) {
  const oos = p.stock === 0;
  return (
    <button
      onPointerDown={() => !oos && onAdd(p)}
      disabled={oos}
      className={`relative flex flex-col text-left p-3 bg-white rounded-2xl border select-none transition-all active:scale-95 ${
        oos ? 'opacity-50 cursor-not-allowed border-gray-100' : 'border-gray-200 active:border-indigo-400 active:bg-indigo-50 shadow-sm'
      }`}
    >
      {p.category && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full mb-1 self-start">
          {p.category.name}
        </span>
      )}
      <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 flex-1">{p.name}</p>
      <p className="text-indigo-700 font-bold text-sm mt-1">{fmt(p.price)}</p>
      <p className={`text-[11px] mt-0.5 font-medium ${oos ? 'text-red-500' : p.stock <= p.minStock ? 'text-amber-500' : 'text-gray-400'}`}>
        {oos ? 'Out of stock' : `${p.stock} left`}
      </p>
    </button>
  );
}

// ── Cart item ─────────────────────────────────────────────────────────────────
function CartItem({ item, onQty, onRemove, fmt }) {
  return (
    <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{item.product.name}</p>
        <p className="text-xs text-gray-400">{fmt(item.unitPrice)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button onPointerDown={() => onQty(item.productId, -1)}
          className="w-7 h-7 rounded-lg bg-white border border-gray-200 active:bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-base transition-all active:scale-90">−</button>
        <span className="w-6 text-center text-sm font-bold text-gray-900">{item.quantity}</span>
        <button onPointerDown={() => onQty(item.productId, 1)}
          className="w-7 h-7 rounded-lg bg-white border border-gray-200 active:bg-gray-100 flex items-center justify-center text-gray-700 font-bold text-base transition-all active:scale-90">+</button>
      </div>
      <span className="text-sm font-bold text-indigo-700 w-16 text-right shrink-0">{fmt(item.unitPrice * item.quantity)}</span>
      <button onPointerDown={() => onRemove(item.productId)} className="text-gray-300 active:text-red-500 p-0.5 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function CartIcon() {
  return (
    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}
