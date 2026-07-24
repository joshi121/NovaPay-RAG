import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Send, Sparkles, RefreshCw, Bot, User, Trash2 } from 'lucide-react';

const Chatbot = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [marketCap, setMarketCap] = useState('all'); // 'large' | 'mid' | 'small' | 'all'
  const messagesEndRef = useRef(null);

  // Fetch chat history from main payment backend on load
  const fetchChatHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/api/payment/user/chat-history');
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Error loading chat history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchChatHistory();
  }, []);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessageContent = input.trim();
    setInput('');
    setLoading(true);

    // 1. Update UI locally with user message
    const tempUserMsg = { role: 'user', content: userMessageContent, _id: 'temp_' + Date.now() };
    const updatedMessages = [...messages, tempUserMsg];
    setMessages(updatedMessages);

    try {
      // 2. Save user message to MongoDB via payment backend
      await api.post('/api/payment/user/chat-message', {
        role: 'user',
        content: userMessageContent
      });

      // 3. Request response from Gen-AI microservice
      // We pass the full history so Groq has conversation context memory
      const aiUrl = import.meta.env.VITE_AI_URL || 'http://localhost:5000';
      const aiResponse = await axios.post(`${aiUrl}/api/ai/chat`, {
        messages: updatedMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        hasClickedButton: false
      });

      const aiReplyContent = aiResponse.data.reply;

      // 4. Save AI reply to MongoDB via payment backend
      await api.post('/api/payment/user/chat-message', {
        role: 'assistant',
        content: aiReplyContent
      });

      // 5. Update local state with real message from database (refetches to match IDs)
      fetchChatHistory();
    } catch (err) {
      console.error('Error during AI chat sequence:', err);
      // Append fallback error message
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I am having trouble connecting to the AI microservice. Make sure it is running on Port 5000 and the GROQ_API_KEY is configured.',
          _id: 'err_' + Date.now()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleExplainStatement = async () => {
    if (loading) return;
    setLoading(true);

    const userMessageContent = "[Action: Explain My Statement]";

    // 1. Update UI locally with user request representation
    const tempUserMsg = { role: 'user', content: userMessageContent, _id: 'temp_' + Date.now() };
    const updatedMessages = [...messages, tempUserMsg];
    setMessages(updatedMessages);

    try {
      // 2. Fetch live statements from payment backend
      const statementRes = await api.get('/api/payment/pay/statement?timeframe=all');
      const ledgerArray = statementRes.data.statement || [];

      // 3. Fetch active accounts and balances to calculate current balance
      const accountsRes = await api.get('/api/payment/accounts/');
      const userAccounts = accountsRes.data.accounts || [];
      let totalBalance = 0;

      for (const acc of userAccounts) {
        if (acc.status === 'ACTIVE') {
          try {
            const balRes = await api.get(`/api/payment/accounts/balance/${acc._id}`);
            totalBalance += balRes.data.balance || 0;
          } catch (balErr) {
            console.error(`Failed to fetch balance for account ${acc._id}:`, balErr);
          }
        }
      }

      // 4. Format the statement context block (limit to latest 10 items for speed/conciseness)
      const cleanLedgerLines = ledgerArray.slice(0, 10).map((entry, index) => {
        const type = entry.type;
        const amount = entry.amount;
        const counterpartName = entry.transaction?.fromAccount?.user?.name || entry.transaction?.toAccount?.user?.name || 'System';
        const date = new Date(entry.createdAt).toLocaleDateString();
        return `[${index + 1}] Date: ${date} | Type: ${type} | Amount: ₹${amount} | Counterparty: ${counterpartName}`;
      });

      const contextPrompt = `Task: Factual analysis. State average outflows if debit data exists, and state total balance at the end. Completely omit any placeholders, disclaimers, or comments about missing data or things that cannot be calculated (e.g. do not say "savings rate cannot be calculated"). Keep it extremely short.
Current Total Balance: ₹${totalBalance}
Transactions:\n${cleanLedgerLines.join('\n')}`;

      // 5. Save user request message representation to MongoDB via payment backend
      await api.post('/api/payment/user/chat-message', {
        role: 'user',
        content: userMessageContent
      });

      // 6. Query Gen-AI microservice with history + newly generated context payload
      const aiPayload = [
        ...messages.map(msg => ({ role: msg.role, content: msg.content })),
        { role: 'user', content: contextPrompt }
      ];

      const aiUrl = import.meta.env.VITE_AI_URL || 'http://localhost:5000';
      const aiResponse = await axios.post(`${aiUrl}/api/ai/chat`, {
        messages: aiPayload,
        hasClickedButton: true
      });

      const aiReplyContent = aiResponse.data.reply;

      // 6. Save AI reply to MongoDB via payment backend
      await api.post('/api/payment/user/chat-message', {
        role: 'assistant',
        content: aiReplyContent
      });

      // 7. Refresh chat logs from database
      fetchChatHistory();
    } catch (err) {
      console.error('Error in statement explanation flow:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I failed to load your transaction statements or connect to the AI microservice.',
          _id: 'err_' + Date.now()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePredictBreakouts = async () => {
    if (loading) return;
    setLoading(true);

    const capLabel = marketCap === 'all' ? 'All Caps' : marketCap === 'large' ? 'Large Cap' : marketCap === 'mid' ? 'Mid Cap' : 'Small Cap';
    const userMessageContent = `[Action: Predict Stock Breakouts - ${capLabel}]`;

    // 1. Update UI locally with user request representation
    const tempUserMsg = { role: 'user', content: userMessageContent, _id: 'temp_' + Date.now() };
    const updatedMessages = [...messages, tempUserMsg];
    setMessages(updatedMessages);

    try {
      // 2. Fetch live statements from payment backend to get historical spending context
      let ledgerArray = [];
      try {
        const statementRes = await api.get('/api/payment/pay/statement?timeframe=all');
        ledgerArray = statementRes.data.statement || [];
      } catch (eErr) {
        console.error('Failed to fetch statements for stocks context:', eErr);
      }

      // 3. Fetch active accounts and balances to calculate total balance
      let totalBalance = 0;
      try {
        const accountsRes = await api.get('/api/payment/accounts/');
        const userAccounts = accountsRes.data.accounts || [];
        for (const acc of userAccounts) {
          if (acc.status === 'ACTIVE') {
            const balRes = await api.get(`/api/payment/accounts/balance/${acc._id}`);
            totalBalance += balRes.data.balance || 0;
          }
        }
      } catch (bErr) {
        console.error('Failed to fetch balances for stocks context:', bErr);
      }

      // 4. Save user message representation to MongoDB via payment backend
      await api.post('/api/payment/user/chat-message', {
        role: 'user',
        content: userMessageContent
      });

      // 5. Query Gen-AI microservice with history + stock parameters + financial health context
      const aiPayload = updatedMessages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const aiUrl = import.meta.env.VITE_AI_URL || 'http://localhost:5000';
      const aiResponse = await axios.post(`${aiUrl}/api/ai/chat`, {
        messages: aiPayload,
        hasClickedStocks: true,
        marketCap: marketCap,
        userBalance: totalBalance,
        ledgerEntries: ledgerArray.slice(0, 10)
      });

      const aiReplyContent = aiResponse.data.reply;

      // 4. Save AI reply to MongoDB via payment backend
      await api.post('/api/payment/user/chat-message', {
        role: 'assistant',
        content: aiReplyContent
      });

      // 5. Refresh chat logs from database
      fetchChatHistory();
    } catch (err) {
      console.error('Error in stock breakouts prediction flow:', err);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I failed to load live stock quotes or connect to the AI microservice.',
          _id: 'err_' + Date.now()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-6 flex flex-col h-screen">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 pb-4 flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">AI Wealth Assistant</h1>
              <p className="text-slate-400 text-xs mt-0.5">Powered by Groq Llama 3.3 70B Model</p>
            </div>
          </div>

          <button
            onClick={fetchChatHistory}
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh Chat History"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Feed */}
        <div className="flex-1 glass-panel rounded-3xl p-6 overflow-y-auto space-y-4 mb-4 border border-slate-800/80 scrollbar-thin scrollbar-thumb-slate-800">
          {loadingHistory ? (
            <div className="h-full flex items-center justify-center text-slate-400 gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span>Loading Chat History...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto">
              <Bot className="w-12 h-12 text-cyan-400 mb-3" />
              <h3 className="text-lg font-bold text-white mb-1">Start a Conversation</h3>
              <p className="text-slate-400 text-xs">
                Ask anything about personal finance, savings, or investment strategies.
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isAi = msg.role === 'assistant';
              return (
                <div
                  key={msg._id}
                  className={`flex items-start gap-3.5 max-w-[85%] ${
                    isAi ? '' : 'ml-auto flex-row-reverse'
                  }`}
                >
                  {/* Avatar Icon */}
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isAi
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
                        : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                    }`}
                  >
                    {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Message Content Bubble */}
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed ${
                      isAi
                        ? 'bg-slate-900/60 border border-slate-800 text-slate-200'
                        : 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-medium shadow-md shadow-cyan-500/10'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              );
            })
          )}
          {loading && (
            <div className="flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl text-sm text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Predefined Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80 max-w-2xl mx-auto w-full">
          <button
            type="button"
            disabled={loading || loadingHistory}
            onClick={handleExplainStatement}
            className="px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-40 w-full sm:w-auto justify-center"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Explain My Statement</span>
          </button>

          <div className="h-px w-full sm:h-5 sm:w-px bg-slate-800" />

          {/* Market Cap Selector */}
          <select
            value={marketCap}
            onChange={(e) => setMarketCap(e.target.value)}
            disabled={loading || loadingHistory}
            className="px-3 py-2 text-xs rounded-xl bg-slate-900 border border-slate-700 text-slate-200 outline-none focus:ring-2 focus:ring-cyan-500/50 w-full sm:w-auto"
          >
            <option value="all">All Caps (Mixed)</option>
            <option value="large">Large Cap (Low Risk)</option>
            <option value="mid">Mid Cap (Moderate Risk)</option>
            <option value="small">Small Cap (High Risk)</option>
          </select>

          <button
            type="button"
            disabled={loading || loadingHistory}
            onClick={handlePredictBreakouts}
            className="px-4 py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/40 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all disabled:opacity-40 w-full sm:w-auto justify-center"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Predict Stock Breakouts</span>
          </button>
        </div>

        {/* Input Bar Form */}
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input
            type="text"
            required
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask AI Assistant anything..."
            className="flex-1 px-5 py-4 rounded-2xl glass-input text-sm border border-slate-800 focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50 outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold shadow-md shadow-cyan-500/15 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </main>
    </div>
  );
};

export default Chatbot;
