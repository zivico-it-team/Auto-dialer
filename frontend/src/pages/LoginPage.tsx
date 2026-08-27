import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Loader2, ArrowRight, ShieldCheck, Headphones, Activity } from 'lucide-react';
import { apiClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/common/ThemeToggle';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const signIn = async (loginEmail: string, loginPassword: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await apiClient.post('/auth/login', {
        email: loginEmail.trim(),
        password: loginPassword,
      });
      if (res.data.success) {
        login(res.data.data.token, res.data.data.user);
        if (res.data.data.user.role === 'AGENT') {
          navigate('/agent-workspace');
        } else if (res.data.data.user.role === 'QA_AUDITOR') {
          navigate('/qa-portal');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  const handleQuickLogin = async (demoEmail: string) => {
    const demoPassword = 'Password123!';
    setEmail(demoEmail);
    setPassword(demoPassword);
    await signIn(demoEmail, demoPassword);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden transition-colors">
      {/* Theme Toggle in Top Right */}
      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Background glowing gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Official Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 mb-3">
          <img
            src="/logo.png"
            alt="Talking Wave Logo"
            className="w-20 h-20 object-contain rounded-xl"
          />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight uppercase font-sans">
          TALKING WAVE
        </h2>
        <p className="mt-1 text-xs font-mono font-bold tracking-widest text-cyan-600 dark:text-cyan-400 uppercase">
          SMART PBX SOLUTION
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 py-8 px-6 shadow-2xl rounded-2xl sm:px-10 backdrop-blur-xl">
          {error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center">
              <span>{error}</span>
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@callcenter.io"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-slate-200 text-sm placeholder-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-sm font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 shadow-lg shadow-cyan-500/25 transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Sign In to Console</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center mb-3">
              One-Click Demo Access
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('admin@callcenter.io')}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-cyan-500 text-center transition-all group disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 mx-auto text-cyan-600 dark:text-cyan-400 mb-1" />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">Admin</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('supervisor@callcenter.io')}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-amber-500 text-center transition-all group disabled:opacity-50"
              >
                <Activity className="w-4 h-4 mx-auto text-amber-600 dark:text-amber-400 mb-1" />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">Supervisor</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('agent1@callcenter.io')}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 text-center transition-all group disabled:opacity-50"
              >
                <Headphones className="w-4 h-4 mx-auto text-emerald-600 dark:text-emerald-400 mb-1" />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">Agent</span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin('qa@callcenter.io')}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-purple-500 text-center transition-all group disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
                <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">QA Auditor</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
