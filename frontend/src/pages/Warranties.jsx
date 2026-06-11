import { useState, useEffect } from 'react';
import { Shield, Search, CheckCircle, XCircle, Clock, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';
import api from '../services/api';

const STATUS_TABS = ['all', 'active', 'expired', 'claimed', 'void'];

export default function Warranties() {
  const [warranties, setWarranties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [checkModal, setCheckModal] = useState(false);
  const [checkInput, setCheckInput] = useState('');
  const [checkResult, setCheckResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [claimModal, setClaimModal] = useState(null);
  const [claimNotes, setClaimNotes] = useState('');

  const fetchWarranties = async () => {
    try {
      const params = {};
      if (tab !== 'all') params.status = tab;
      if (search) params.search = search;
      const res = await api.get('/warranties', { params });
      setWarranties(res.data);
    } catch { toast.error('Failed to load warranties'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchWarranties(); }, [tab, search]);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!checkInput.trim()) return;
    setChecking(true);
    setCheckResult(null);
    try {
      const isSerial = !checkInput.startsWith('INV-');
      const res = await api.post('/warranties/check', isSerial ? { serialNumber: checkInput } : { invoiceNo: checkInput });
      setCheckResult(res.data);
    } catch (err) {
      setCheckResult({ error: err.response?.data?.error || 'Not found' });
    } finally { setChecking(false); }
  };

  const handleClaim = async () => {
    if (!claimModal) return;
    try {
      await api.put(`/warranties/${claimModal.id}/claim`, { notes: claimNotes });
      toast.success('Warranty marked as claimed');
      setClaimModal(null);
      setClaimNotes('');
      fetchWarranties();
    } catch { toast.error('Failed to update warranty'); }
  };

  const getStatusBadge = (w) => {
    const now = new Date();
    const expired = new Date(w.endDate) < now;
    const days = differenceInDays(new Date(w.endDate), now);
    if (w.status === 'claimed') return <span className="badge-gray flex items-center gap-1"><CheckCircle size={11} /> Claimed</span>;
    if (w.status === 'void') return <span className="badge-gray flex items-center gap-1"><XCircle size={11} /> Void</span>;
    if (expired || w.status === 'expired') return <span className="badge-red flex items-center gap-1"><XCircle size={11} /> Expired</span>;
    if (days <= 30) return <span className="badge-yellow flex items-center gap-1"><AlertTriangle size={11} /> Expiring ({days}d)</span>;
    return <span className="badge-green flex items-center gap-1"><CheckCircle size={11} /> Active</span>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Warranty Management</h1>
        <button onClick={() => { setCheckModal(true); setCheckResult(null); setCheckInput(''); }} className="btn-primary flex items-center gap-2">
          <Shield size={16} /> Check Warranty
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-9 text-sm" placeholder="Search by serial, invoice, product, customer..." />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Product', 'Customer', 'Serial No.', 'Invoice', 'Start', 'Expires', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {warranties.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-48">
                      <p className="truncate">{w.product?.name}</p>
                      <p className="text-xs text-gray-500">{w.product?.category?.name}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{w.customer?.name || <span className="text-gray-400">Walk-in</span>}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{w.serialNumber || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-primary-700">{w.invoiceNo}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{format(new Date(w.startDate), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{format(new Date(w.endDate), 'dd MMM yyyy')}</td>
                    <td className="px-4 py-3">{getStatusBadge(w)}</td>
                    <td className="px-4 py-3">
                      {w.status === 'active' && new Date(w.endDate) >= new Date() && (
                        <button
                          onClick={() => { setClaimModal(w); setClaimNotes(''); }}
                          className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg font-medium"
                        >
                          Claim
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {warranties.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-400">No warranties found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warranty Check Modal */}
      {checkModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Shield size={18} className="text-primary-600" /> Check Warranty</h3>
              <button onClick={() => setCheckModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCheck} className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={checkInput}
                  onChange={(e) => setCheckInput(e.target.value)}
                  className="input-field flex-1"
                  placeholder="Serial number or Invoice No (INV-...)"
                  autoFocus
                />
                <button type="submit" disabled={checking} className="btn-primary px-4">
                  {checking ? '...' : 'Check'}
                </button>
              </form>

              {checkResult && (
                <div className="space-y-3">
                  {checkResult.error ? (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{checkResult.error}</div>
                  ) : (
                    checkResult.map((w, i) => {
                      const expired = new Date(w.endDate) < new Date();
                      return (
                        <div key={i} className={`p-4 rounded-xl border ${expired || w.status === 'expired' ? 'bg-red-50 border-red-200' : w.status === 'claimed' ? 'bg-gray-50 border-gray-200' : 'bg-green-50 border-green-200'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-semibold text-gray-800">{w.product?.name}</p>
                              {w.customer && <p className="text-sm text-gray-600">Customer: {w.customer.name}</p>}
                              {w.serialNumber && <p className="text-sm text-gray-600">S/N: {w.serialNumber}</p>}
                              <p className="text-sm text-gray-600">Invoice: {w.invoiceNo}</p>
                              <p className="text-sm text-gray-600">Purchase: {format(new Date(w.startDate), 'dd MMM yyyy')}</p>
                              <p className="text-sm text-gray-600">Expires: {format(new Date(w.endDate), 'dd MMM yyyy')}</p>
                              {!expired && w.daysRemaining > 0 && (
                                <p className="text-sm font-semibold text-green-700">{w.daysRemaining} days remaining</p>
                              )}
                            </div>
                            <span className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${
                              w.status === 'claimed' ? 'bg-gray-100 text-gray-700' :
                              expired || w.status === 'expired' ? 'bg-red-100 text-red-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {w.status === 'claimed' ? 'CLAIMED' : expired || w.status === 'expired' ? 'EXPIRED' : 'VALID'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Claim Modal */}
      {claimModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">Process Warranty Claim</h3>
              <button onClick={() => setClaimModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 rounded-xl">
                <p className="font-medium text-amber-800">{claimModal.product?.name}</p>
                {claimModal.serialNumber && <p className="text-sm text-amber-700">S/N: {claimModal.serialNumber}</p>}
                <p className="text-sm text-amber-700">Invoice: {claimModal.invoiceNo}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Claim Notes (optional)</label>
                <textarea value={claimNotes} onChange={(e) => setClaimNotes(e.target.value)} className="input-field resize-none" rows={3} placeholder="Describe the issue..." />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setClaimModal(null)} className="btn-secondary">Cancel</button>
                <button onClick={handleClaim} className="btn-primary bg-amber-500 hover:bg-amber-600">Mark as Claimed</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
