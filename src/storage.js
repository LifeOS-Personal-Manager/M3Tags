import { fromStorageRecord, toStorageRecord } from './tagUtils.js';

const localKey = 'm3-tag-records';

const runtimeConfig = globalThis.window?.M3_TAGS_CONFIG || {};
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || runtimeConfig.supabaseUrl;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || runtimeConfig.supabaseAnonKey;

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
    throw new Error(formatSupabaseError(message, response.status));
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
    const path = record.id && isUuid(record.id)
      ? `tag_records?id=eq.${encodeURIComponent(record.id)}`
      : 'tag_records?on_conflict=document_id';
    const method = record.id && isUuid(record.id) ? 'PATCH' : 'POST';
    const [saved] = await supabaseFetch(path, {
      method,
      headers: method === 'POST' ? { Prefer: 'resolution=merge-duplicates,return=representation' } : undefined,
      body: JSON.stringify(method === 'PATCH' ? { ...payload, updated_at: new Date().toISOString() } : payload),
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
    const saved = await supabaseFetch('tag_records?on_conflict=document_id', {
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

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value || '');
}

function formatSupabaseError(message, status) {
  try {
    const error = JSON.parse(message);
    if (error.code === 'PGRST205') {
      return 'Supabase 未找到 public.tag_records 表。请先在 Supabase SQL Editor 执行 supabase.schema.sql，然后刷新页面。';
    }
    return error.message || message || `Supabase request failed: ${status}`;
  } catch {
    return message || `Supabase request failed: ${status}`;
  }
}
