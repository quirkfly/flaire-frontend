import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Lock, Mail, LogIn } from 'lucide-react';

const SignIn = ({ onSwitch, onSuccess }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await signIn(email.trim(), password);
      onSuccess?.();
    } catch (err:any) {
      setError(err.message || 'Sign in failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md w-full mx-auto bg-gray-900/70 backdrop-blur-xl rounded-3xl p-10 border border-gray-800 shadow-2xl">
      <h2 className="text-3xl font-bold text-white mb-6 text-center">Welcome Back</h2>
      <form onSubmit={submit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <div className="relative">
            <Mail className="w-5 h-5 absolute left-3 top-3 text-gray-500" />
            <input type="email" required value={email} onChange={e=>setEmail(e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent" placeholder="you@example.com" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
          <div className="relative">
            <Lock className="w-5 h-5 absolute left-3 top-3 text-gray-500" />
            <input type="password" required value={password} onChange={e=>setPassword(e.target.value)}
              className="w-full bg-gray-800/60 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent" placeholder="••••••••" />
          </div>
        </div>
        {error && <div className="text-sm text-red-400 bg-red-900/30 border border-red-700/40 px-4 py-2 rounded-lg">{error}</div>}
        <button type="submit" disabled={loading}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl flex items-center justify-center space-x-2 shadow-lg">
          <LogIn className={`w-5 h-5 ${loading? 'animate-spin':''}`} />
          <span>{loading? 'Signing In...' : 'Sign In'}</span>
        </button>
      </form>
      <div className="text-center mt-6 text-gray-400 text-sm">
        No account? <button onClick={onSwitch} className="text-cyan-400 hover:text-cyan-300 font-medium">Create one</button>
      </div>
    </div>
  );
};

export default SignIn;
