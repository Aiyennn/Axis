import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, ArrowRight, Lock, Mail, AlertCircle, Loader2 } from 'lucide-react';
import axisLogo from '../assets/logo.png';

export const SignIn: React.FC = () => {
  const { authenticate, busy, error } = useApp();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!email || !email.includes('@')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setFormError('Password must be at least 6 characters.');
      return;
    }

    try {
      await authenticate(mode, email, password);
    } catch {
      // Error handled by AppContext
    }
  };

  const handleDemoLogin = async () => {
    setEmail('student@university.edu');
    setPassword('student123');
    setFormError('');
    try {
      // Try logging in, or register if account does not exist yet
      await authenticate('login', 'student@university.edu', 'student123');
    } catch {
      try {
        await authenticate('register', 'student@university.edu', 'student123');
      } catch {
        // AppContext displays error
      }
    }
  };

  return (
    <div className="min-h-screen w-screen bg-[#09090b] text-[#f4f4f5] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[350px] bg-violet-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Card Container */}
      <div className="w-full max-w-md bg-[#121215] border border-[#27272a] shadow-2xl relative z-10 p-6 sm:p-8">
        {/* Header / Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 mb-3 flex items-center justify-center">
            <img src={axisLogo} alt="Axis Logo" className="w-full h-full object-contain filter drop-shadow-md" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            AXIS
            <span className="text-xs px-2 py-0.5 font-mono font-medium rounded-full bg-violet-950/80 text-violet-300 border border-violet-800/40">
              v1.0
            </span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            AI-Powered Productivity Command Center
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 p-1 bg-[#18181b] border border-[#27272a] mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setFormError(''); }}
            className={`py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
              mode === 'login'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setFormError(''); }}
            className={`py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
              mode === 'register'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Display Error Message */}
        {(formError || error) && (
          <div className="mb-5 p-3 bg-red-950/40 border border-red-900/50 flex items-start gap-2.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{formError || error}</div>
          </div>
        )}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5 font-mono">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                autoComplete="email"
                className="w-full pl-9 pr-3 py-2.5 bg-[#18181b] border border-[#27272a] text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 uppercase tracking-wider mb-1.5 font-mono">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                maxLength={128}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                className="w-full pl-9 pr-3 py-2.5 bg-[#18181b] border border-[#27272a] text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1 font-mono">Minimum 6 characters</p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy}
            className="w-full mt-2 py-3 px-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-950/20"
          >
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating…</span>
              </>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In to Workspace' : 'Create Free Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Access Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#27272a]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#121215] px-2 text-zinc-500 font-mono tracking-wider">
              Instant Demo
            </span>
          </div>
        </div>

        {/* Demo Fast Login Button */}
        <button
          type="button"
          disabled={busy}
          onClick={handleDemoLogin}
          className="w-full py-2.5 px-4 bg-[#18181b] hover:bg-[#202024] border border-[#27272a] hover:border-zinc-600 text-zinc-300 hover:text-white text-xs font-mono font-medium flex items-center justify-center gap-2 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Launch with Demo Student Account</span>
        </button>

        {/* Footer info */}
        <div className="mt-6 text-center text-[11px] text-zinc-600">
          Student freelance dashboard &bull; Google Gemini &bull; PostgreSQL
        </div>
      </div>
    </div>
  );
};

export default SignIn;
