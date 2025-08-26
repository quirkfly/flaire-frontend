const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

// New end-to-end generation directly from photo URLs (no local analysis required)
export async function generateProfileFromPhotoUrls(photoUrls: string[], preferences?: Record<string, any>) {
  const res = await fetch(`${API_BASE}/profile/generate-from-photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_urls: photoUrls, preferences })
  });
  if (!res.ok) throw new Error('Photo URL profile generation failed');
  return res.json();
}

// Conversation starters generation from a single (or multiple) target photo data URLs
export async function generateConversationStarters(photoUrls: string[], context?: string, preferences?: Record<string, any>) {
  const res = await fetch(`${API_BASE}/conversation/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photo_urls: photoUrls, context, preferences })
  });
  if (!res.ok) throw new Error('Conversation starters generation failed');
  return res.json();
}
