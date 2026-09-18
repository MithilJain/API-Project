"use client";

import { useEffect, useState } from 'react';
import { Key, Copy, RefreshCw, Trash2, Terminal, Plus, Loader2, WifiOff } from 'lucide-react';
import { listApiKeys, createApiKey, rollApiKey, revokeApiKey, ApiKeyPublic, API_BASE_URL } from '@/lib/api';

export default function ApiDeveloper() {
  const [keys, setKeys] = useState<ApiKeyPublic[]>([]);
  const [revealedKey, setRevealedKey] = useState<{ id: string; key: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    listApiKeys()
      .then((data) => {
        setKeys(data);
        setError(null);
      })
      .catch(() => setError('Could not reach the SAFE-RAG API.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    const label = window.prompt('Label for the new key', 'New Key');
    if (label === null) return;
    const created = await createApiKey(label || 'Untitled Key');
    setRevealedKey({ id: created.id, key: created.key });
    load();
  };

  const handleRoll = async (id: string) => {
    setBusyId(id);
    try {
      const rolled = await rollApiKey(id);
      setRevealedKey({ id: rolled.id, key: rolled.key });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleRevoke = async (id: string) => {
    setBusyId(id);
    try {
      await revokeApiKey(id);
      if (revealedKey?.id === id) setRevealedKey(null);
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Developer API</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your authentication keys and integrate SAFE-RAG into your backend.</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-center">
          <WifiOff className="w-5 h-5 mr-3 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

        {/* Left Col: Key Manager */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center">
                <Key className="w-5 h-5 mr-2 text-blue-500" /> API Keys
              </h2>
              <button onClick={handleCreate} className="text-blue-600 dark:text-blue-400 hover:text-blue-700" title="Create new key">
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            ) : (
              <div className="space-y-3">
                {keys.map((k) => {
                  const displayed = revealedKey?.id === k.id ? revealedKey.key : k.key_preview;
                  return (
                    <div key={k.id} className={`border rounded-lg p-3 ${k.revoked ? 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 opacity-60' : 'border-gray-200 dark:border-gray-800'}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{k.label}</p>
                        {k.revoked && <span className="text-xs text-red-500 dark:text-red-400 font-semibold">REVOKED</span>}
                      </div>
                      <p className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1 break-all">{displayed}</p>
                      {k.last_used_at && <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Last used {new Date(k.last_used_at).toLocaleString()}</p>}
                      <div className="flex space-x-3 mt-2">
                        <button onClick={() => handleCopy(displayed)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center">
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </button>
                        {!k.revoked && (
                          <>
                            <button disabled={busyId === k.id} onClick={() => handleRoll(k.id)} className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center disabled:opacity-50">
                              <RefreshCw className="w-3 h-3 mr-1" /> Roll
                            </button>
                            <button disabled={busyId === k.id} onClick={() => handleRevoke(k.id)} className="text-xs text-red-500 dark:text-red-400 hover:text-red-700 flex items-center disabled:opacity-50">
                              <Trash2 className="w-3 h-3 mr-1" /> Revoke
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
                {keys.length === 0 && <p className="text-sm text-gray-400 dark:text-gray-500">No keys yet. Click + to create one.</p>}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Interactive Documentation */}
        <div className="md:col-span-2">
          <div className="bg-gray-900 rounded-xl shadow-lg overflow-hidden border border-gray-800">
            <div className="flex items-center px-4 py-3 border-b border-gray-800 bg-gray-950">
              <Terminal className="w-4 h-4 text-gray-400 mr-2" />
              <span className="text-sm font-medium text-gray-300">POST /v1/verify</span>
            </div>
            <div className="p-6">
              <p className="text-gray-400 text-sm mb-4">Send a payload containing the source context and LLM answer to receive a calibrated hallucination risk score.</p>

              <div className="bg-black/50 p-4 rounded-lg overflow-x-auto">
                <pre className="text-sm font-mono text-gray-300 whitespace-pre">
{`curl -X POST ${API_BASE_URL}/v1/verify \\
  -H "Authorization: Bearer sk_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "context": "Q3 Revenue was $45M.",
    "answer": "Revenue hit $50M in Q3."
  }'`}
                </pre>
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-200 mb-2">Expected Response</h3>
                <div className="bg-black/50 p-4 rounded-lg overflow-x-auto">
                  <pre className="text-sm font-mono text-gray-400">
{`{
  "claims": [
    {
      "text": "Revenue hit $50M in Q3.",
      "verdict": "Contradicted",
      "risk_score": 92.0,
      "error_type": "numerical_mismatch"
    }
  ],
  "hallucination_rate": 100.0,
  "engine": "gemini"
}`}
                  </pre>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-4">
                Full interactive docs (Swagger UI): <code className="text-gray-300">{API_BASE_URL}/docs</code>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
