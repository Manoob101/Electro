import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Barcode, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import BarcodeGenerator from '../components/BarcodeGenerator';
import { useAuth } from '../contexts/AuthContext';

const EMPTY_FORM = {
  name: '', description: '', sku: '', barcode: '', categoryId: '', supplierId: '',
  price: '', costPrice: '', stock: '', minStock: '5', warrantyMonths: '0', imageUrl: '',
};

function generateEAN13() {
  let digits = '890';
  for (let i = 0; i < 9; i++) digits += Math.floor(Math.random() * 10);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  digits += ((10 - (sum % 10)) % 10).toString();
  return digits;
}

function slugify(name) {
  return name.toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').slice(0, 15) + '-' + Math.floor(100 + Math.random() * 900);
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showBarcode, setShowBarcode] = useState(null);
  const [saving, setSaving] = useState(false);
  const { isAdmin } = useAuth();

  const fetchData = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (catFilter) params.categoryId = catFilter;
      const [pRes, cRes, sRes] = await Promise.all([
        api.get('/products', { params }),
        api.get('/categories'),
        api.get('/suppliers'),
      ]);
      setProducts(pRes.data);
      setCategories(cRes.data);
      setSuppliers(sRes.data);
    } catch { toast.error('Failed to load products'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [search, catFilter]);

  const openNew = () => { setForm(EMPTY_FORM); setEditId(null); setShowModal(true); };
  const openEdit = (p) => {
    setForm({
      name: p.name, description: p.description || '', sku: p.sku, barcode: p.barcode || '',
      categoryId: p.categoryId || '', supplierId: p.supplierId || '',
      price: p.price, costPrice: p.costPrice, stock: p.stock, minStock: p.minStock,
      warrantyMonths: p.warrantyMonths, imageUrl: p.imageUrl || '',
    });
    setEditId(p.id);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/products/${editId}`, form);
        toast.success('Product updated');
      } else {
        await api.post('/products', form);
        toast.success('Product created');
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Deactivate "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deactivated');
      fetchData();
    } catch { toast.error('Delete failed'); }
  };

  const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        {isAdmin && (
          <button onClick={openNew} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Add Product
          </button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 text-sm" placeholder="Search products..." />
        </div>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="input-field w-auto text-sm">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Product', 'SKU / Barcode', 'Category', 'Price', 'Stock', 'Warranty', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                          <Package size={16} className="text-primary-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{p.name}</p>
                          {p.description && <p className="text-xs text-gray-400 truncate max-w-48">{p.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs text-gray-700">{p.sku}</p>
                      {p.barcode && <p className="font-mono text-xs text-gray-400">{p.barcode}</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{p.category?.name || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{fmt(p.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        p.stock === 0 ? 'bg-red-100 text-red-700' : p.stock <= p.minStock ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{p.warrantyMonths > 0 ? `${p.warrantyMonths}m` : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {p.barcode && (
                          <button onClick={() => setShowBarcode(showBarcode === p.id ? null : p.id)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg" title="Show Barcode">
                            <Barcode size={15} />
                          </button>
                        )}
                        {isAdmin && (
                          <>
                            <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                              <Edit size={15} />
                            </button>
                            <button onClick={() => handleDelete(p.id, p.name)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                      {showBarcode === p.id && (
                        <div className="mt-2 p-2 bg-white border border-gray-200 rounded-xl shadow-sm">
                          <BarcodeGenerator value={p.barcode} productName={p.name} price={p.price} />
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-10 text-gray-400">No products found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">{editId ? 'Edit Product' : 'New Product'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><Plus size={20} className="rotate-45" /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input type="text" value={form.name} onChange={(e) => {
                  const name = e.target.value;
                  setForm((f) => ({ ...f, name, sku: f.sku || slugify(name) }));
                }} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU *</label>
                <input type="text" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className="input-field font-mono" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
                <div className="flex gap-2">
                  <input type="text" value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))} className="input-field font-mono flex-1" placeholder="EAN-13 or custom" />
                  <button type="button" onClick={() => setForm((f) => ({ ...f, barcode: generateEAN13() }))} className="btn-secondary text-xs whitespace-nowrap px-3">Generate</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} className="input-field">
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <select value={form.supplierId} onChange={(e) => setForm((f) => ({ ...f, supplierId: e.target.value }))} className="input-field">
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price (₹) *</label>
                <input type="number" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className="input-field" min="0" step="0.01" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price (₹)</label>
                <input type="number" value={form.costPrice} onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))} className="input-field" min="0" step="0.01" />
              </div>
              {!editId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Stock</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} className="input-field" min="0" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock Alert</label>
                <input type="number" value={form.minStock} onChange={(e) => setForm((f) => ({ ...f, minStock: e.target.value }))} className="input-field" min="0" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty (months)</label>
                <input type="number" value={form.warrantyMonths} onChange={(e) => setForm((f) => ({ ...f, warrantyMonths: e.target.value }))} className="input-field" min="0" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input-field resize-none" rows={2} />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary px-8">{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
