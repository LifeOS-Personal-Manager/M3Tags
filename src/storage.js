import { fromStorageRecord, toStorageRecord } from './tagUtils.js';

const localKey = 'm3-tag-records';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const storageMode = supabaseUrl && supabaseAnonKey ? 'supabase' : 'local';

async function supabaseFetch(path, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase request failed: ${response.status}`);
  }

  if (response.status === 204) return null;
  return response.json();
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(localKey) || '[]').map(fromStorageRecord);
  } catch {
    return [];
  }
}

function writeLocal(records) {
  localStorage.setItem(localKey, JSON.stringify(records));
}

export async function listRecords() {
  if (storageMode === 'supabase') {
    const data = await supabaseFetch('tag_records?select=*&order=created_at.desc');
    return data.map(fromStorageRecord);
  }
  return readLocal();
}

export async function saveRecord(record) {
  if (storageMode === 'supabase') {
    const payload = toStorageRecord(record);
    const path = record.id
      ? `tag_records?id=eq.${encodeURIComponent(record.id)}`
      : 'tag_records';
    const method = record.id ? 'PATCH' : 'POST';
    const [saved] = await supabaseFetch(path, {
      method,
      body: JSON.stringify(record.id ? { ...payload, updated_at: new Date().toISOString() } : payload),
    });
    return fromStorageRecord(saved);
  }

  const records = readLocal();
  const id = record.id || record.documentId;
  const saved = {
    ...record,
    id,
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const next = records.some((item) => item.id === id)
    ? records.map((item) => (item.id === id ? saved : item))
    : [saved, ...records];
  writeLocal(next);
  return saved;
}

export async function deleteRecord(id) {
  if (storageMode === 'supabase') {
    await supabaseFetch(`tag_records?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    return;
  }
  writeLocal(readLocal().filter((record) => record.id !== id));
}

export async function replaceRecords(records) {
  if (storageMode === 'supabase') {
    const saved = await supabaseFetch('tag_records', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(records.map(toStorageRecord)),
    });
    return saved.map(fromStorageRecord);
  }
  const normalized = records.map((record) => ({
    ...fromStorageRecord(record),
    id: record.id || record.documentId || crypto.randomUUID(),
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  writeLocal(normalized);
  return normalized;
}
