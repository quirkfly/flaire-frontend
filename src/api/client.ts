// Simple API client for Flaire backend
export interface AuthToken {
  access_token: string;
  token_type: string;
}

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export async function register(email: string, password: string, fullName: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, full_name: fullName })
  });
  if (!res.ok) throw new Error('Registration failed');
  return res.json();
}

export async function login(email: string, password: string): Promise<AuthToken> {
  const form = new FormData();
  form.append('email', email);
  form.append('password', password);
  const res = await fetch(`${API_BASE}/auth/login`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Login failed');
  return res.json();
}

export async function uploadPhotos(files: File[], token: string) {
  const form = new FormData();
  files.forEach(f => form.append('files', f));
  const res = await fetch(`${API_BASE}/photos/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
}

export async function generateProfile(photoIds: string[], token: string) {
  const res = await fetch(`${API_BASE}/profile/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(photoIds)
  });
  if (!res.ok) throw new Error('Profile generation failed');
  return res.json();
}
