import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { FileText, Calendar, ArrowUpRight, ArrowDownLeft, RefreshCw, UserCheck, CreditCard, ShieldCheck } from 'lucide-react';

const Statement = () => {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState('all'); // 'day' | 'week' | 'month' | 'all'
  const [view, setView] = useState('my'); // 'my' | 'system'
  const [statement, setStatement] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStatement = async (filter, viewType) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/payment/pay/statement?timeframe=${filter}&view=${viewType}`);
      setStatement(res.data.statement || []);
    } catch (err) {
      console.error('Error fetching statement:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatement(timeframe, view);
  }, [timeframe, view]);

  return (
    <div className="min-h-screen pb-16">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6">
        {/* Header & Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Bank Statements & Audit Trail</h1>
            <p className="text-slate-400 text-sm mt-1">
              View double-entry ledger history populated with Mongo Account IDs & Usernames
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Admin Audit View Selector */}
            {user?.systemUser && (
              <div className="flex bg-amber-500/10 p-1.5 rounded-2xl border border-amber-500/30">
                <button
                  type="button"
                  onClick={() => setView('my')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    view === 'my'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-amber-300 hover:text-amber-200'
                  }`}
                >
                  My Statement
                </button>
                <button
                  type="button"
                  onClick={() => setView('system')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                    view === 'system'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-amber-300 hover:text-amber-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>System Audit</span>
                </button>
              </div>
            )}

            {/* Timeframe Filter Buttons */}
            <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setTimeframe('day')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  timeframe === 'day'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('week')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  timeframe === 'week'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                This Week
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('month')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  timeframe === 'month'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={() => setTimeframe('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  timeframe === 'all'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Time
              </button>
            </div>
          </div>
        </div>

        {/* Statement Table */}
        <div className="glass-panel rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
          {loading ? (
            <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
              <span>Fetching Ledger Statement...</span>
            </div>
          ) : statement.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">No Ledger Entries Found</h3>
              <p className="text-sm">There are no transactions recorded for the selected timeframe ({timeframe}).</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="py-4 px-6">Type & Date</th>
                    <th className="py-4 px-6">My Account ID</th>
                    <th className="py-4 px-6">Counterparty Details (User & Mongo ID)</th>
                    <th className="py-4 px-6">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {statement.map((entry) => {
                    const isCredit = entry.type === 'CREDIT';
                    const rawDate = entry.createdAt || entry.transaction?.createdAt;
                    const dateStr = rawDate ? new Date(rawDate).toLocaleString() : 'Recent';

                    // Determine sender/receiver details
                    const txn = entry.transaction;
                    const counterpartAccount = isCredit ? txn?.fromAccount : txn?.toAccount;
                    const counterpartUser = counterpartAccount?.user;

                    return (
                      <tr key={entry._id} className="hover:bg-slate-900/40 transition-colors">
                        {/* Type & Date */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-xl border ${
                                isCredit
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {isCredit ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <span className={`font-bold block ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {isCredit ? 'CREDIT (RECEIVED)' : 'DEBIT (SENT)'}
                              </span>
                              <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3 text-slate-500" />
                                {dateStr}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* My Account ID */}
                        <td className="py-4 px-6 font-mono text-xs text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-cyan-400" />
                            <span>{entry.account?._id || 'N/A'}</span>
                          </div>
                        </td>

                        {/* Counterparty User & Account ID */}
                        <td className="py-4 px-6">
                          {counterpartUser ? (
                            <div>
                              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                                <span>{counterpartUser.name}</span>
                                {counterpartUser.systemUser && (
                                  <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                                    System Admin
                                  </span>
                                )}
                                <span className="text-xs text-slate-400 font-normal">({counterpartUser.email})</span>
                              </div>
                              <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                Acc ID: <code className="text-cyan-300">{counterpartAccount?._id}</code>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-amber-400 font-medium text-xs">
                              <ShieldCheck className="w-4 h-4" />
                              <span>System Authority Deposit</span>
                            </div>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-6 font-extrabold text-base">
                          <span className={isCredit ? 'text-emerald-400' : 'text-slate-200'}>
                            {isCredit ? '+' : '-'} ₹{entry.amount.toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Statement;
