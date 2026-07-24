import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { Send, ShieldCheck, ArrowRightLeft, DollarSign, CheckCircle2, AlertCircle, RefreshCw, CreditCard } from 'lucide-react';

const Transfer = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('user'); // 'user' | 'system'

  // User Accounts for dropdown selection
  const [userAccounts, setUserAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // User Transfer Form State
  const [fromAccount, setFromAccount] = useState('');
  const [toAccount, setToAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState(() => 'key_' + Math.random().toString(36).substring(2, 11));
  const [userLoading, setUserLoading] = useState(false);
  const [userResult, setUserResult] = useState(null);

  // System Initial Deposit Form State
  const [sysToAccount, setSysToAccount] = useState('');
  const [sysAmount, setSysAmount] = useState('');
  const [sysKey, setSysKey] = useState(() => 'sys_key_' + Math.random().toString(36).substring(2, 11));
  const [sysLoading, setSysLoading] = useState(false);
  const [sysResult, setSysResult] = useState(null);

  useEffect(() => {
    const fetchUserAccounts = async () => {
      setLoadingAccounts(true);
      try {
        const res = await api.get('/api/payment/accounts/');
        const accs = res.data.accounts || [];
        setUserAccounts(accs);
        if (accs.length > 0) {
          setFromAccount(accs[0]._id);
        }
      } catch (err) {
        console.error('Error fetching accounts for transfer:', err);
      } finally {
        setLoadingAccounts(false);
      }
    };
    fetchUserAccounts();
  }, []);

  const handleUserTransfer = async (e) => {
    e.preventDefault();
    if (!fromAccount || !toAccount || !amount || !idempotencyKey) return;
    setUserLoading(true);
    setUserResult(null);

    try {
      const res = await api.post('/api/payment/pay/transaction', {
        fromAccount,
        toAccount,
        amount: Number(amount),
        idempotencyKey,
      });
      setUserResult({ success: true, message: res.data.message, data: res.data.transaction });
      setIdempotencyKey('key_' + Math.random().toString(36).substring(2, 11));
    } catch (err) {
      setUserResult({ success: false, message: err.response?.data?.message || 'Transfer failed' });
    } finally {
      setUserLoading(false);
    }
  };

  const handleSystemTransfer = async (e) => {
    e.preventDefault();
    if (!sysToAccount || !sysAmount || !sysKey) return;
    setSysLoading(true);
    setSysResult(null);

    try {
      const res = await api.post('/api/payment/pay/init-transaction', {
        toAccount: sysToAccount,
        amount: Number(sysAmount),
        idempotencyKey: sysKey,
      });
      setSysResult({ success: true, message: res.data.message, data: res.data.transaction });
      setSysKey('sys_key_' + Math.random().toString(36).substring(2, 11));
    } catch (err) {
      setSysResult({ success: false, message: err.response?.data?.message || 'System funding failed' });
    } finally {
      setSysLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-16">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Money Transfer Hub</h1>
          <p className="text-slate-400 text-sm mt-1">Execute double-entry ledger transfers safely</p>
        </div>

        {/* Tab Switcher - Only visible if user has systemUser privileges */}
        {user && user.systemUser ? (
          <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 max-w-md mx-auto mb-8">
            <button
              type="button"
              onClick={() => setActiveTab('user')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'user'
                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>User Transfer</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('system')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'system'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>System Deposit (Admin)</span>
            </button>
          </div>
        ) : null}

        {/* USER TRANSFER FORM */}
        {activeTab === 'user' && (
          <div className="glass-panel p-8 rounded-3xl shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Send className="w-5 h-5 text-cyan-400" />
              <span>Peer-to-Peer Transfer</span>
            </h2>

            {userResult && (
              <div
                className={`mb-6 p-4 rounded-2xl border text-sm flex items-start gap-3 ${
                  userResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {userResult.success ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
                <div>
                  <div className="font-semibold">{userResult.message}</div>
                  {userResult.data && (
                    <div className="text-xs text-slate-300 mt-1 font-mono">
                      Status: {userResult.data.status} | Txn ID: {userResult.data._id}
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleUserTransfer} className="space-y-5">
              {/* Show selected account or selector if user has multiple */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Sending From Account
                </label>
                {loadingAccounts ? (
                  <div className="h-11 glass-input rounded-xl animate-pulse" />
                ) : userAccounts.length === 0 ? (
                  <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-xl border border-red-500/30">
                    No active accounts found for your user. Please go to "My Accounts" and create an account first!
                  </div>
                ) : userAccounts.length === 1 ? (
                  <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-sm">
                    <span className="text-slate-400 text-xs uppercase font-semibold">Selected Account</span>
                    <code className="text-cyan-400 font-mono text-xs">{fromAccount}</code>
                  </div>
                ) : (
                  <select
                    value={fromAccount}
                    onChange={(e) => setFromAccount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl glass-input text-sm font-mono bg-slate-900 text-slate-200"
                  >
                    {userAccounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc._id} ({acc.currency || 'INR'})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Receiver Details (Account ID or Email)
                </label>
                <input
                  type="text"
                  required
                  value={toAccount}
                  onChange={(e) => setToAccount(e.target.value)}
                  placeholder="e.g. 6a6100be867257cb733ee33a or name@example.com"
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Transfer Amount
                </label>
                <div className="relative">
                  <DollarSign className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1000"
                    className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-sm font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={userLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {userLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Processing Transaction...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Execute Transaction</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* SYSTEM INITIAL DEPOSIT FORM */}
        {activeTab === 'system' && (
          <div className="glass-panel p-8 rounded-3xl shadow-2xl border border-purple-500/30">
            <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
              <ShieldCheck className="w-6 h-6 shrink-0" />
              <div>
                <span className="font-bold block text-sm">System Authority Deposit</span>
                This endpoint requires <code className="bg-amber-950/60 px-1 py-0.5 rounded text-amber-200">systemUser: true</code> authority. It credits initial funds directly into a target user account.
              </div>
            </div>

            {sysResult && (
              <div
                className={`mb-6 p-4 rounded-2xl border text-sm flex items-start gap-3 ${
                  sysResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                }`}
              >
                {sysResult.success ? <CheckCircle2 className="w-5 h-5 mt-0.5 shrink-0" /> : <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />}
                <div>
                  <div className="font-semibold">{sysResult.message}</div>
                  {sysResult.data && (
                    <div className="text-xs text-slate-300 mt-1 font-mono">
                      Status: {sysResult.data.status} | Txn ID: {sysResult.data._id}
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSystemTransfer} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Target User Account ID (To)
                </label>
                <input
                  type="text"
                  required
                  value={sysToAccount}
                  onChange={(e) => setSysToAccount(e.target.value)}
                  placeholder="e.g. 64b8f... (Target Account ID)"
                  className="w-full px-4 py-3 rounded-xl glass-input text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Initial Deposit Amount
                </label>
                <div className="relative">
                  <DollarSign className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="number"
                    min="1"
                    required
                    value={sysAmount}
                    onChange={(e) => setSysAmount(e.target.value)}
                    placeholder="50000"
                    className="w-full pl-11 pr-4 py-3 rounded-xl glass-input text-sm font-semibold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={sysLoading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {sysLoading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Processing Initial Deposit...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Inject Initial Funds</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default Transfer;
