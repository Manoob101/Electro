import { useState, useEffect } from 'react';
import { Save, UserPlus, ToggleLeft, ToggleRight, Store, Users, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

export default function Settings() {
  const [tab, setTab] = useState('shop');
  const [shop, setShop] = useState({
    name: localStorage.getItem('shopName') || 'ElectroPOS',
    address: localStorage.getItem('shopAddress') || '',
    phone: localStorage.getItem('shopPhone') || '',
    gst: localStorage.getItem('shopGST') || '',
    taxRate: localStorage.getItem('taxRate') || '0',
  });
  const [users, setUsers] = useState([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ name: '', email: '', password: '', role: 'cashier' });

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch { }
  };

  useEffect(() => { fetchUsers(); }, []);

  const saveShop = (e) => {
    e.preventDefault();
    Object.entries(shop).forEach(([k, v]) => {
      if (k === 'name') localStorage.setItem('shopName', v);
      else if (k === 'address') localStorage.setItem('shopAddress', v);
      else if (k === 'phone') localStorage.setItem('shopPhone', v);
      else if (k === 'gst') localStorage.setItem('shopGST', v);
      else if (k === 'taxRate') localStorage.setItem('taxRate', v);
    });
    toast.success('Shop settings saved');
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      await api.post('/users', userForm);
      toast.success('User created');
      setShowUserModal(false);
      setUserForm({ name: '', email: '', password: '', role: 'cashier' });
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    }
  };

  const toggleUser = async (id, name) => {
    try {
      await api.put(`/users/${id}/toggle-active`);
      toast.success(`User ${name} toggled`);
      fetchUsers();
    } catch { toast.error('Failed to toggle user'); }
  };

  return (
    <div className="space-y-5 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'shop', label: 'Shop', icon: Store },
          { key: 'users', label: 'Users', icon: Users },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'shop' && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-5 flex items-center gap-2"><Store size={18} className="text-primary-600" /> Shop Information</h3>
          <form onSubmit={saveShop} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: 'Shop Name', key: 'name', placeholder: 'My Electronics Shop' },
                { label: 'Phone Number', key: 'phone', placeholder: '+91 98765 43210' },
                { label: 'GST Number', key: 'gst', placeholder: '27AADCB2230M1Z3' },
                { label: 'Default Tax Rate (%)', key: 'taxRate', type: 'number', placeholder: '18' },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type || 'text'}
                    value={shop[key]}
                    onChange={(e) => setShop((s) => ({ ...s, [key]: e.target.value }))}
                    className="input-field"
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shop Address</label>
              <textarea
                value={shop.address}
                onChange={(e) => setShop((s) => ({ ...s, address: e.target.value }))}
                className="input-field resize-none"
                rows={2}
                placeholder="123 Main Street, City, State - 400001"
              />
            </div>
            <div className="p-4 bg-blue-50 rounded-xl text-sm text-blue-700">
              <Shield size={15} className="inline mr-1" />
              Shop settings are stored locally in this browser. Each device/browser needs to be configured separately.
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn-primary flex items-center gap-2"><Save size={16} /> Save Settings</button>
            </div>
          </form>
        </div>
      )}

      {tab === 'users' && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2"><Users size={18} className="text-primary-600" /> User Management</h3>
            <button onClick={() => setShowUserModal(true)} className="btn-primary flex items-center gap-2 text-sm">
              <UserPlus size={15} /> Add User
            </button>
          </div>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0">
                  {u.name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {u.role}
                </span>
                <button
                  onClick={() => toggleUser(u.id, u.name)}
                  className={`p-1 rounded transition-colors ${u.isActive ? 'text-green-500 hover:text-green-700' : 'text-gray-400 hover:text-gray-600'}`}
                  title={u.isActive ? 'Deactivate' : 'Activate'}
                >
                  {u.isActive ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">New User</h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {[
                { label: 'Full Name', key: 'name', type: 'text' },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Password', key: 'password', type: 'password' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input type={type} value={userForm[key]} onChange={(e) => setUserForm((f) => ({ ...f, [key]: e.target.value }))} className="input-field" required />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={userForm.role} onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))} className="input-field">
                  <option value="cashier">Cashier</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowUserModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
