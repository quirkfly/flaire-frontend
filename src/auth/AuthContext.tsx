import React, { createContext, useContext, useState, useEffect } from 'react';
// Using JSDoc for lightweight typing without TS build setup
/** @typedef {'free'|'pro'|'premium'} PlanTier */
/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} name
 * @property {PlanTier} plan
 * @property {string} createdAt
 */

/** @type {React.Context<any>} */
const AuthContext = createContext(undefined);

const STORAGE_KEY = 'flare_auth_user_v1';

function fakeHash(pwd: string) { return btoa(pwd).slice(0,12); }

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { setUser(JSON.parse(raw)); } catch {}
    }
    setLoading(false);
  }, []);

  const persist = (u) => {
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); else localStorage.removeItem(STORAGE_KEY);
  };

  const signIn = async (email, password) => {
    if (!password) throw new Error('Password required');
    const API_BASE = import.meta?.env?.VITE_API_BASE || 'http://localhost:8000';
    const res = await fetch(`${API_BASE}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || 'Sign in failed');
    }
  const data = await res.json();
  const u = { id: data.id, email: data.email, name: data.name, plan: data.plan, createdAt: data.created_at, token: data.token };
    setUser(u); persist(u);
  };

  const signUp = async (name, email, password) => {
    if (!email.includes('@')) throw new Error('Invalid email');
    const API_BASE = import.meta?.env?.VITE_API_BASE || 'http://localhost:8000';
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    if (!res.ok) {
      const msg = await res.text();
      throw new Error(msg || 'Signup failed');
    }
  const data = await res.json();
  const newUser = { id: data.id, email: data.email, name: data.name, plan: data.plan, createdAt: data.created_at, token: data.token };
    setUser(newUser); persist(newUser);
  };

  const signOut = () => { setUser(null); persist(null); };
  const API_BASE = import.meta?.env?.VITE_API_BASE || 'http://localhost:8000';

  const refreshUser = async () => {
    if(!user?.token) return;
    try {
      const res = await fetch(`${API_BASE}/auth/me`, { headers: { Authorization: `Bearer ${user.token}` }});
      if(res.ok){
        const data = await res.json();
        const merged = { ...user, plan: data.plan };
        setUser(merged); persist(merged);
      }
    } catch(e){ /* swallow */ }
  };

  const upgradePlan = async (plan) => {
    if (!user) throw new Error('Not signed in');
    // Request Stripe Checkout session
    const res = await fetch(`${API_BASE}/billing/create-checkout-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({ plan })
    });
    if(!res.ok){
      const msg = await res.text();
      throw new Error(msg || 'Checkout session failed');
    }
    const data = await res.json();
    if(data.url){
      window.location.href = data.url; // redirect to Stripe Checkout
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, upgradePlan, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
