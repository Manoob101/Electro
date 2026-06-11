import { useState, useEffect } from 'react';
import { Plus, Search, Users, Phone, Mail, ShoppingBag, Shield, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import api from '../services/api';

const EMPTY = { name: '', email: '', phone: '', address: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [detailCustomer, setDetailCustomer] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetch = async () => {
    try {
      const res = await api.get('/customers', { params: search ? { search } : {} });
      setCustomers(res.data);
    } catch { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, [search]);

  const openNew = () => { setForm(EMPTY); setEditId(null); setShowModal(true); };
  const openEdit = (c) => { setForm({ name: c.name, email: c.email || '', phone: c.phone || '', address: c.address || '' }); setEditId(c.id); setShowModal(true); };

  const openDetail = async (c) => {
    setDetailCustomer(c);
    setDetailLoading(true);
    try {
      const res = await api.get(`/customers/${c.id}`);
      setDetailCustomer(res.data);
    } catch { }
    finally { setDetailLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.put(`/customers/${editId}`, form);
        toast.success('Customer updated');
      } else {
        await api.post('/customers', form);
        toast.success('Customer added');
      }
      setShowModal(false);
      fetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Save failed'); }
  };

  const fmt = (n) => `LKR ${Number(n || 0).toFixed(2)}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <button onClick={openNew} className="btn-primary flex items-center gap-2"><Plus size={16} /> Add Customer</button>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 text-sm" placeholder="Search customers..." />
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div> : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Name', 'Phone', 'Email', 'Total Purchases', 'Since', 'Actions'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => openDetail(c)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-sm flex items-center justify-center shrink-0">
                        {c.name[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.phone || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email || '—'}</td>
                  <td className="px-4 py-3 font-medium">{c._count?.sales || 0}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{format(new Date(c.createdAt), 'dd MMM yyyy')}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(c)} className="text-xs px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg">Edit</button>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td colSpan={6} className="text-center py-10 text-gray-400">No customers found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">{editId ? 'Edit Customer' : 'New Customer'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              {[
                { label: 'Name *', key: 'name', type: 'text', required: true },
                { label: 'Phone', key: 'phone', type: 'tel' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Address', key: 'address', type: 'text' },
              ].map(({ label, key, type, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="input-field" required={required} />
                </div>
              ))}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailCustomer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/50" onClick={() => setDetailCustomer(null)} />
          <div className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center">
                  {detailCustomer.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{detailCustomer.name}</h3>
                  {detailCustomer.phone && <p className="text-sm text-gray-500">{detailCustomer.phone}</p>}
                </div>
              </div>
              <button onClick={() => setDetailCustomer(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-6">
              {detailLoading ? (
                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary-600" /></div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {detailCustomer.phone && <div className="flex items-center gap-2 text-sm text-gray-600"><Phone size={14} className="text-gray-400" />{detailCustomer.phone}</div>}
                    {detailCustomer.email && <div className="flex items-center gap-2 text-sm text-gray-600"><Mail size={14} className="text-gray-400" />{detailCustomer.email}</div>}
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-3"><ShoppingBag size={15} /> Purchase History</h4>
                    {(!detailCustomer.sales || detailCustomer.sales.length === 0) ? (
                      <p className="text-gray-400 text-sm">No purchases yet</p>
                    ) : (
                      <div className="space-y-2">
                        {detailCustomer.sales.map((sale) => (
                          <div key={sale.id} className="p-3 bg-gray-50 rounded-xl">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-xs text-primary-700">{sale.invoiceNo}</span>
                              <span className="font-bold text-sm">{fmt(sale.total)}</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{format(new Date(sale.createdAt), 'dd MMM yyyy HH:mm')} · {sale.items?.length} items</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-3"><Shield size={15} /> Warranties</h4>
                    {(!detailCustomer.warranties || detailCustomer.warranties.length === 0) ? (
                      <p className="text-gray-400 text-sm">No warranties</p>
                    ) : (
                      <div className="space-y-2">
                        {detailCustomer.warranties.map((w) => {
                          const expired = new Date(w.endDate) < new Date();
                          return (
                            <div key={w.id} className="p-3 bg-gray-50 rounded-xl">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-sm">{w.product?.name}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${expired ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                  {w.status === 'claimed' ? 'Claimed' : expired ? 'Expired' : 'Active'}
                                </span>
                              </div>
                              {w.serialNumber && <p className="text-xs text-gray-500 mt-0.5">S/N: {w.serialNumber}</p>}
                              <p className="text-xs text-gray-500">Expires: {format(new Date(w.endDate), 'dd MMM yyyy')}</p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
