import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Wallet, LogOut, User as UserIcon, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-6 py-4 mb-8">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
              PaymentDummy
            </span>
            <span className="block text-[10px] uppercase tracking-wider text-cyan-400 font-semibold">
              Ledger Engine
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
          <Link
            to="/accounts"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive('/accounts') || isActive('/')
                ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            My Accounts
          </Link>
          <Link
            to="/transfer"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive('/transfer')
                ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Send Money
          </Link>
          <Link
            to="/statement"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive('/statement')
                ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Bank Statement
          </Link>
          <Link
            to="/chatbot"
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isActive('/chatbot')
                ? 'bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            AI Chatroom
          </Link>
        </nav>

        {/* User Badge & Logout */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="text-left hidden sm:block">
              <span className="block text-sm font-medium text-slate-200">{user.name}</span>
              <span className="block text-[11px] text-slate-400 truncate max-w-[140px]">{user.email}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2.5 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all flex items-center gap-2 text-sm font-medium cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
