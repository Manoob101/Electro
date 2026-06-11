import { useState, useEffect } from 'react';
import { Download, TrendingUp, ShoppingBag, DollarSign, Users } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays } from 'date-fns';
import api from '../services/api';

const COLORS = ['#4f46e5', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444'];

export default function Reports() {
  const [sales, setSales] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, chartRes] = await Promise.all([
        api.get('/sales', { params: { startDate, endDate, page, limit: 20 } }),
        api.get('/reports/sales-chart', { params: { days: 30 } }),
      ]);
      setSales(salesRes.data.sales);
      setTotal(salesRes.data.total);
      setChartData(chartRes.data);
    } catch { }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [startDate, endDate, page]);

  const totalRevenue = sales.reduce((sum, s) => s.paymentStatus !== 'refunded' ? sum + s.total : sum, 0);
  const avgOrder = sales.length > 0 ? totalRevenue / sales.filter((s) => s.paymentStatus !== 'refunded').length : 0;

  const paymentMethodData = sales.reduce((acc, s) => {
    if (s.paymentStatus === 'refunded') return acc;
    const existing = acc.find((a) => a.name === s.paymentMethod);
    if (existing) { existing.value += s.total; existing.count += 1; }
    else acc.push({ name: s.paymentMethod, value: s.total, count: 1 });
    return acc;
  }, []);

  const exportCSV = () => {
    const header = 'Invoice,Date,Customer,Items,Payment Method,Total,Status';
    const rows = sales.map((s) => [
      s.invoiceNo,
      format(new Date(s.createdAt), 'dd/MM/yyyy HH:mm'),
      s.customer?.name || 'Walk-in',
      s._count?.items || 0,
      s.paymentMethod,
      s.total.toFixed(2),
      s.paymentStatus,
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${startDate}-${endDate}.csv`;
    a.click();
  };

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <button onClick={exportCSV} className="btn-secondary flex items-center gap-2 text-sm">
          <Download size={15} /> Export CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">From:</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input-field text-sm w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">To:</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input-field text-sm w-auto" />
        </div>
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => { setStartDate(format(subDays(new Date(), d), 'yyyy-MM-dd')); setEndDate(format(new Date(), 'yyyy-MM-dd')); }}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600">
            Last {d}d
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: DollarSign, label: 'Total Revenue', value: fmt(totalRevenue), color: 'bg-green-500' },
          { icon: ShoppingBag, label: 'Total Sales', value: sales.filter((s) => s.paymentStatus !== 'refunded').length, color: 'bg-primary-500' },
          { icon: TrendingUp, label: 'Avg Order Value', value: fmt(avgOrder), color: 'bg-blue-500' },
          { icon: Users, label: 'Unique Customers', value: new Set(sales.filter((s) => s.customerId).map((s) => s.customerId)).size, color: 'bg-amber-500' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card flex items-center gap-3 py-4">
            <div className={`${color} p-2.5 rounded-xl shrink-0`}><Icon size={16} className="text-white" /></div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-4">Daily Sales (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v + 'T00:00:00'), 'dd')} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
              <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']} labelFormatter={(l) => format(new Date(l + 'T00:00:00'), 'dd MMM')} />
              <Bar dataKey="total" fill="#4f46e5" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Payment Methods</h3>
          {paymentMethodData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-400 text-sm">No data</div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={paymentMethodData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                  {paymentMethodData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Sales Transactions</h3>
          <span className="text-sm text-gray-500">{total} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Invoice', 'Date', 'Customer', 'Cashier', 'Items', 'Payment', 'Total', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-10"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto" /></td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-10 text-gray-400">No sales in selected range</td></tr>
              ) : (
                sales.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-primary-700">{s.invoiceNo}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap text-xs">{format(new Date(s.createdAt), 'dd MMM yyyy HH:mm')}</td>
                    <td className="px-4 py-3 text-gray-700">{s.customer?.name || <span className="text-gray-400">Walk-in</span>}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.user?.name}</td>
                    <td className="px-4 py-3 text-gray-600">{s._count?.items}</td>
                    <td className="px-4 py-3 capitalize text-gray-600 text-xs">{s.paymentMethod}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{fmt(s.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        s.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                        s.paymentStatus === 'refunded' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{s.paymentStatus}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40">Previous</button>
            <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
            <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm py-1.5 px-3 disabled:opacity-40">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
