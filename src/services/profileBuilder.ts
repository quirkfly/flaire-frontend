import { uploadPhotos, generateProfile } from '../api/client';

export interface LocalPhoto { id: number; file: File; url: string; name: string; backendId?: string }

export async function ensureUploaded(photos: LocalPhoto[], token: string) {
  const pending = photos.filter(p => !p.backendId);
  if(!pending.length) return photos;
  const res = await uploadPhotos(pending.map(p=>p.file), token);
  const idByFilename: Record<string,string> = {};
  res.photos.forEach((p:any)=>{ idByFilename[p.filename]=p.id; });
  return photos.map(p => p.backendId ? p : { ...p, backendId: idByFilename[p.name] });
}

export async function buildProfile(photos: LocalPhoto[], token: string) {
  const uploaded = await ensureUploaded(photos, token);
  const ids = uploaded.map(p=>p.backendId).filter((x): x is string => Boolean(x));
  if(!ids.length) throw new Error('No uploaded photo ids');
  return generateProfile(ids, token);
}

export async function orchestrateProfileBuild(photos: LocalPhoto[], token: string, onState?: (s:string)=>void) {
  try {
    onState?.('uploading');
    const uploaded = await ensureUploaded(photos, token);
    onState?.('generating');
    const profile = await buildProfile(uploaded, token);
    onState?.('done');
    return profile;
  } catch (e) {
    onState?.('error');
    throw e;
  }
}
