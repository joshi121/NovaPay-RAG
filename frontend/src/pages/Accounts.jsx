import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import Navbar from '../components/Navbar';
import { Plus, CreditCard, Eye, EyeOff, ShieldAlert, RefreshCw, Copy, Check } from 'lucide-react';

const Accounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [balances, setBalances] = useState({}); // { accountId: number }
  const [loadingBalances, setLoadingBalances] = useState({}); // { accountId: boolean }
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [currency, setCurrency] = useState('INR');
  const [accountName, setAccountName] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [message, setMessage] = useState(null);

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await api.get('/api/payment/accounts/');
      setAccounts(res.data.accounts || []);
    } catch (err) {
      console.error('Fetch accounts error:', err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setCreating(true);
    setMessage(null);
    try {
      const res = await api.post('/api/payment/accounts/', { currency, name: accountName });
      setMessage({ type: 'success', text: res.data.message || 'Account created!' });
      setAccountName('');
      fetchAccounts();
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Creation failed' });
    } finally {
      setCreating(false);
    }
  };

  const handleFetchBalance = async (accountId) => {
    // If balance is already revealed, clicking toggles it off
    if (balances[accountId] !== undefined) {
      setBalances((prev) => {
        const copy = { ...prev };
        delete copy[accountId];
        return copy;
      });
      return;
    }

    setLoadingBalances((prev) => ({ ...prev, [accountId]: true }));
    try {
      const res = await api.get(`/api/payment/accounts/balance/${accountId}`);
      setBalances((prev) => ({ ...prev, [accountId]: res.data.balance }));
    } catch (err) {
      console.error('Fetch balance error:', err);
    } finally {
      setLoadingBalances((prev) => ({ ...prev, [accountId]: false }));
    }
  };

  const copyToClipboard = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6">
        {/* Header Title & Actions */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Account Portfolio</h1>
            <p className="text-slate-400 text-sm mt-1">Manage user accounts and check real-time balances on-demand</p>
          </div>

          <form onSubmit={handleCreateAccount} className="flex flex-col sm:flex-row items-center gap-3 glass-panel p-2 rounded-2xl">
            <input
              type="text"
              placeholder="Account Name (e.g. Primary Savings)"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-cyan-500/50 w-full sm:w-56"
            />
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-3 py-2 focus:ring-2 focus:ring-cyan-500/50"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>

            <button
              type="submit"
              disabled={creating}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-md shadow-cyan-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              {creating ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>New Account</span>
                </>
              )}
            </button>
          </form>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm border flex items-center justify-between ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="font-bold ml-2">×</button>
          </div>
        )}

        {/* Accounts Grid */}
        {loadingAccounts ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="glass-panel p-6 rounded-3xl animate-pulse h-48" />
            ))}
          </div>
        ) : accounts.length === 0 ? (
          <div className="glass-panel rounded-3xl p-12 text-center max-w-lg mx-auto my-12">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4 text-slate-400">
              <CreditCard className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Active Accounts Found</h3>
            <p className="text-slate-400 text-sm mb-6">Create your first account above to begin processing transactions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {accounts.map((acc) => {
              const isRevealed = balances[acc._id] !== undefined;
              const isLoading = loadingBalances[acc._id];

              return (
                <div
                  key={acc._id}
                  className="glass-panel p-6 rounded-3xl relative overflow-hidden group border border-slate-800/80 hover:border-cyan-500/40 transition-all shadow-xl"
                >
                  {/* Decorative background glow */}
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all" />

                  <div className="mb-3">
                    <h3 className="text-lg font-bold text-white tracking-tight truncate">
                      {acc.name || `${acc.currency || 'INR'} Wallet`}
                    </h3>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      {acc.status}
                    </span>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Currency: {acc.currency || 'INR'}
                    </span>
                  </div>

                  {/* Account ID */}
                  <div className="mb-6">
                    <span className="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">
                      Account ID
                    </span>
                    <div className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <code className="text-xs text-cyan-300 font-mono truncate">{acc._id}</code>
                      <button
                        onClick={() => copyToClipboard(acc._id)}
                        className="text-slate-400 hover:text-cyan-400 transition-colors p-1"
                        title="Copy Account ID"
                      >
                        {copiedId === acc._id ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Balance Display (On-Demand) */}
                  <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80 mb-4">
                    <span className="block text-xs text-slate-400 font-medium mb-1">
                      Available Balance
                    </span>

                    {isRevealed ? (
                      <div className="text-2xl font-extrabold text-white tracking-tight">
                        {acc.currency === 'USD' ? '$' : acc.currency === 'EUR' ? '€' : '₹'}
                        {balances[acc._id].toLocaleString()}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500 text-sm font-medium">
                        <ShieldAlert className="w-4 h-4" />
                        <span>Hidden for Privacy</span>
                      </div>
                    )}
                  </div>

                  {/* Check / Hide Balance Button */}
                  <button
                    onClick={() => handleFetchBalance(acc._id)}
                    disabled={isLoading}
                    className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      isRevealed
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30'
                    }`}
                  >
                    {isLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                    ) : isRevealed ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        <span>Hide Balance</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>Check Balance</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Accounts;
