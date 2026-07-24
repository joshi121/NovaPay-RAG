import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const FloatingAi = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || location.pathname === '/chatbot') return null;

  return (
    <Link
      to="/chatbot"
      className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:scale-110 active:scale-95 transition-all duration-300 border border-white/20 group cursor-pointer"
      title="Ask AI Assistant"
    >
      <div className="absolute inset-0 rounded-full bg-cyan-400 opacity-0 group-hover:opacity-20 animate-ping duration-1000" />
      <Sparkles className="w-6 h-6 text-white group-hover:rotate-12 transition-transform duration-300" />
    </Link>
  );
};

export default FloatingAi;
