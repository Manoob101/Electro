import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, ShoppingBag, Package, AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import api from '../services/api';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="card flex items-start gap-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/reports/dashboard'), api.get('/reports/sales-chart')])
      .then(([dashRes, chartRes]) => {
        setData(dashRes.data);
        setChartData(chartRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
    </div>
  );

  const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back! Here's your business overview.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Today's Sales" value={fmt(data.todaySales.total)} sub={`${data.todaySales.count} transactions`} color="bg-green-500" />
        <StatCard icon={TrendingUp} label="This Month" value={fmt(data.thisMonthSales.total)} sub={`${data.thisMonthSales.count} transactions`} color="bg-primary-500" />
        <StatCard icon={Package} label="Total Products" value={data.totalProducts} sub="Active products" color="bg-blue-500" />
        <StatCard icon={AlertTriangle} label="Low Stock" value={data.lowStockCount} sub="Products need restock" color="bg-amber-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-4">Sales (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tickFormatter={(v) => format(new Date(v + 'T00:00:00'), 'dd')} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
              <Tooltip
                formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Revenue']}
                labelFormatter={(l) => format(new Date(l + 'T00:00:00'), 'dd MMM yyyy')}
              />
              <Bar dataKey="total" fill="#4f46e5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Top Products (30d)</h3>
          <div className="space-y-3">
            {data.topProducts.length === 0 && <p className="text-gray-400 text-sm">No sales yet</p>}
            {data.topProducts.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.totalSold} sold · {fmt(p.totalRevenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Recent Sales</h3>
            <Link to="/reports" className="text-primary-600 text-sm flex items-center gap-1 hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-2 font-medium">Invoice</th>
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Items</th>
                  <th className="pb-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="py-2.5 font-mono text-xs text-primary-700">{sale.invoiceNo}</td>
                    <td className="py-2.5 text-gray-700">{sale.customer?.name || <span className="text-gray-400">Walk-in</span>}</td>
                    <td className="py-2.5 text-gray-500">{sale._count.items}</td>
                    <td className="py-2.5 text-right font-semibold text-gray-800">{fmt(sale.total)}</td>
                  </tr>
                ))}
                {data.recentSales.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-gray-400">No sales yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Low Stock Alerts</h3>
            <Link to="/inventory" className="text-primary-600 text-sm flex items-center gap-1 hover:underline">
              View <ArrowRight size={14} />
            </Link>
          </div>
          <div className="space-y-2">
            {data.lowStockProducts.length === 0 && <p className="text-gray-400 text-sm">All stocked up!</p>}
            {data.lowStockProducts.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-1">
                <span className="text-sm text-gray-700 truncate flex-1 mr-2">{p.name}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {p.stock} left
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
