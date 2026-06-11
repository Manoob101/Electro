import { useState, useEffect } from 'react';
import { Package, TrendingUp, TrendingDown, AlertTriangle, Plus, Minus, Settings2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ type: 'in', quantity: '', notes: '', reference: '' });
  const [historyModal, setHistoryModal] = useState(null);
  const [history, setHistory] = useState([]);
  const { isAdmin } = useAuth();

  const fetchInventory = async () => {
    try {
      const res = await api.get('/reports/inventory');
      setProducts(res.data);
    } catch { toast.error('Failed to load inventory'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchInventory(); }, []);

  const openHistory = async (product) => {
    setHistoryModal(product);
    try {
      const res = await api.get(`/products/${product.id}`);
      setHistory(res.data.stockMovements || []);
    } catch { setHistory([]); }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/products/${adjustModal.id}/adjust-stock`, {
        type: adjustForm.type,
        quantity: parseInt(adjustForm.quantity),
        notes: adjustForm.notes,
        reference: adjustForm.reference,
      });
      toast.success('Stock adjusted');
      setAdjustModal(null);
      fetchInventory();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Adjustment failed');
    }
  };

  const stats = {
    total: products.length,
    outOfStock: products.filter((p) => p.stock === 0).length,
    lowStock: products.filter((p) => p.stock > 0 && p.stock <= p.minStock).length,
    inStock: products.filter((p) => p.stock > p.minStock).length,
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total Products', value: stats.total, color: 'bg-blue-500', Icon: Package },
          { label: 'In Stock', value: stats.inStock, color: 'bg-green-500', Icon: TrendingUp },
          { label: 'Low Stock', value: stats.lowStock, color: 'bg-amber-500', Icon: AlertTriangle },
          { label: 'Out of Stock', value: stats.outOfStock, color: 'bg-red-500', Icon: TrendingDown },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="card flex items-center gap-3 py-4">
            <div className={`${color} p-2.5 rounded-xl`}><Icon size={18} className="text-white" /></div>
            <div>
              <p className="text-xl font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Product', 'SKU', 'Category', 'Current Stock', 'Min Stock', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{p.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.sku}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.category?.name || '—'}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{p.stock}</td>
                  <td className="px-4 py-3 text-gray-500">{p.minStock}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      p.stockStatus === 'out_of_stock' ? 'bg-red-100 text-red-700' :
                      p.stockStatus === 'low_stock' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {p.stockStatus === 'out_of_stock' ? 'Out of Stock' : p.stockStatus === 'low_stock' ? 'Low Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openHistory(p)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg text-xs" title="Stock history">
                        <Settings2 size={14} />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => { setAdjustModal(p); setAdjustForm({ type: 'in', quantity: '', notes: '', reference: '' }); }}
                          className="px-2.5 py-1 text-xs bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg font-medium"
                        >
                          Adjust
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {adjustModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">Adjust Stock — {adjustModal.name}</h3>
              <button onClick={() => setAdjustModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleAdjust} className="p-6 space-y-4">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Current stock:</span>
                <span className="font-bold text-lg text-gray-900">{adjustModal.stock}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adjustment Type</label>
                <div className="flex gap-2">
                  {[
                    { v: 'in', label: 'Add Stock', icon: Plus },
                    { v: 'out', label: 'Remove Stock', icon: Minus },
                    { v: 'adjustment', label: 'Set Exact', icon: Settings2 },
                  ].map(({ v, label, icon: Icon }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setAdjustForm((f) => ({ ...f, type: v }))}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1 transition-colors ${
                        adjustForm.type === v ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200 hover:border-primary-400'
                      }`}
                    >
                      <Icon size={12} /> {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {adjustForm.type === 'adjustment' ? 'New Stock Quantity' : 'Quantity'}
                </label>
                <input type="number" value={adjustForm.quantity} onChange={(e) => setAdjustForm((f) => ({ ...f, quantity: e.target.value }))} className="input-field" min="1" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference (optional)</label>
                <input type="text" value={adjustForm.reference} onChange={(e) => setAdjustForm((f) => ({ ...f, reference: e.target.value }))} className="input-field" placeholder="PO number, invoice..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input type="text" value={adjustForm.notes} onChange={(e) => setAdjustForm((f) => ({ ...f, notes: e.target.value }))} className="input-field" placeholder="Reason for adjustment..." />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setAdjustModal(null)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Apply</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
              <h3 className="font-semibold text-gray-800">Stock History — {historyModal.name}</h3>
              <button onClick={() => setHistoryModal(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="overflow-y-auto p-6">
              {history.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No stock movements</p>
              ) : (
                <div className="space-y-2">
                  {history.map((m) => (
                    <div key={m.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${m.type === 'in' ? 'bg-green-100' : m.type === 'out' ? 'bg-red-100' : 'bg-blue-100'}`}>
                        {m.type === 'in' ? <Plus size={12} className="text-green-700" /> : m.type === 'out' ? <Minus size={12} className="text-red-700" /> : <Settings2 size={12} className="text-blue-700" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold ${m.type === 'in' ? 'text-green-700' : m.type === 'out' ? 'text-red-700' : 'text-blue-700'}`}>
                            {m.type === 'in' ? '+' : m.type === 'out' ? '-' : '='}{m.quantity}
                          </span>
                          <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString()}</span>
                        </div>
                        {m.reference && <p className="text-xs text-gray-500">Ref: {m.reference}</p>}
                        {m.notes && <p className="text-xs text-gray-500">{m.notes}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
