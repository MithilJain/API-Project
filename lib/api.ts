import axios, { AxiosInstance } from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const STORAGE_KEY = 'safe_rag_api_key';
let cachedKey: string | null = null;

function getStoredKey(): string | null {
  if (cachedKey) return cachedKey;
  if (typeof window === 'undefined') return null;
  try {
    cachedKey = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    cachedKey = null;
  }
  return cachedKey;
}

function setStoredKey(key: string) {
  cachedKey = key;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, key);
    } catch {
      // ignore (private browsing / storage disabled)
    }
  }
}

function clearStoredKey() {
  cachedKey = null;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

const client: AxiosInstance = axios.create({ baseURL: API_BASE_URL });

client.interceptors.request.use((cfg) => {
  const key = getStoredKey();
  if (key) {
    cfg.headers = cfg.headers ?? {};
    cfg.headers.Authorization = `Bearer ${key}`;
  }
  return cfg;
});

// Self-heals a stale cached key (e.g. the backend's key store was reset
// while the browser still had an old key in localStorage): on a 401 from
// anything other than the bootstrap call itself, drop the stale key,
// mint a fresh one, and retry the request exactly once.
client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const status = error?.response?.status;
    const config = error?.config as (typeof error.config & { _retriedAfterKeyRefresh?: boolean }) | undefined;
    const isBootstrapCall = config?.url?.includes('/v1/api-keys/bootstrap');

    if (status === 401 && config && !config._retriedAfterKeyRefresh && !isBootstrapCall) {
      config._retriedAfterKeyRefresh = true;
      clearStoredKey();
      try {
        await ensureApiKey();
        return client(config);
      } catch {
        // fall through to the original 401 if re-bootstrapping also fails
      }
    }
    return Promise.reject(error);
  }
);

/** Ensures a usable API key exists in localStorage, creating one via the
 * backend's bootstrap endpoint on first run so the demo needs zero setup. */
export async function ensureApiKey(): Promise<string> {
  const existing = getStoredKey();
  if (existing) return existing;
  const res = await client.post('/v1/api-keys/bootstrap');
  setStoredKey(res.data.key);
  return res.data.key;
}

// ---- Types ----

export type Verdict = 'Supported' | 'Contradicted' | 'Abstain';
export type ErrorType =
  | 'numerical_mismatch'
  | 'entity_mismatch'
  | 'temporal_mismatch'
  | 'formatting_mismatch'
  | 'contradiction'
  | 'unverifiable'
  | 'none';

export interface Claim {
  id: string;
  text: string;
  verdict: Verdict;
  risk_score: number;
  evidence?: string | null;
  error_type?: ErrorType | null;
}

export interface VerifyResponse {
  id: string;
  model: string;
  created_at: string;
  claims: Claim[];
  hallucination_rate: number;
  engine: string;
}

export interface ThresholdSettings {
  lower_bound: number;
  upper_bound: number;
}

export interface ApiKeyPublic {
  id: string;
  label: string;
  created_at: string;
  last_used_at: string | null;
  revoked: boolean;
  key_preview: string;
}

export interface ApiKeyCreated extends ApiKeyPublic {
  key: string;
}

export interface HistoryRecord {
  created_at: string;
  source: 'studio';
  model: string;
  snippet: string;
  engine: string;
  claims: { text: string; verdict: Verdict; risk_score: number; error_type: ErrorType }[];
}

export interface AnalyticsSummary {
  total_verifications: number;
  total_claims: number;
  hallucination_rate: number;
  error_type_breakdown: Record<string, number>;
  engine_breakdown: Record<string, number>;
  recent: HistoryRecord[];
}

export interface TimeseriesPoint {
  date: string;
  rate: number;
}

export interface ModelStat {
  model: string;
  total: number;
  supported_rate: number;
  contradicted_rate: number;
  abstain_rate: number;
}

// ---- API calls ----

export async function verify(context: string, answer: string, model?: string): Promise<VerifyResponse> {
  await ensureApiKey();
  const res = await client.post('/v1/verify', { context, answer, model });
  return res.data;
}

export async function getSettings(): Promise<ThresholdSettings> {
  await ensureApiKey();
  const res = await client.get('/v1/settings');
  return res.data;
}

export async function updateSettings(settings: ThresholdSettings): Promise<ThresholdSettings> {
  await ensureApiKey();
  const res = await client.put('/v1/settings', settings);
  return res.data;
}

export async function listApiKeys(): Promise<ApiKeyPublic[]> {
  const res = await client.get('/v1/api-keys');
  return res.data;
}

export async function createApiKey(label: string): Promise<ApiKeyCreated> {
  const res = await client.post('/v1/api-keys', { label });
  return res.data;
}

export async function rollApiKey(id: string): Promise<ApiKeyCreated> {
  const res = await client.post(`/v1/api-keys/${id}/roll`);
  return res.data;
}

export async function revokeApiKey(id: string): Promise<ApiKeyPublic> {
  const res = await client.post(`/v1/api-keys/${id}/revoke`);
  return res.data;
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  await ensureApiKey();
  const res = await client.get('/v1/analytics/summary');
  return res.data;
}

export async function getAnalyticsTimeseries(): Promise<TimeseriesPoint[]> {
  await ensureApiKey();
  const res = await client.get('/v1/analytics/timeseries');
  return res.data;
}

export async function getModelStats(): Promise<ModelStat[]> {
  await ensureApiKey();
  const res = await client.get('/v1/analytics/models');
  return res.data;
}
