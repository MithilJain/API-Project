"use client";

import { useState } from 'react';
import { AlertCircle, CheckCircle2, HelpCircle, Loader2, PlaySquare, WifiOff } from 'lucide-react';
import { verify, Claim, Verdict } from '@/lib/api';
import { EngineBadge } from '@/components/ui/Badge';
import { VERDICT_COLORS } from '@/lib/colors';

export default function VerificationStudio() {
  const [context, setContext] = useState('');
  const [answer, setAnswer] = useState('');
  const [model, setModel] = useState('Custom LLM');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<Claim[] | null>(null);
  const [engine, setEngine] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const res = await verify(context, answer, model || undefined);
      setResults(res.claims);
      setEngine(res.engine);
    } catch (e: unknown) {
      const message =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        'Could not reach the SAFE-RAG API. Is the backend running on http://localhost:8000?';
      setError(message);
      setResults(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const getVerdictColors = (verdict: Verdict) => {
    const c = VERDICT_COLORS[verdict];
    return `${c.bg} ${c.border} ${c.text}`;
  };

  const getVerdictIcon = (verdict: Verdict) => {
    switch (verdict) {
      case 'Supported': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'Contradicted': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'Abstain': return <HelpCircle className="w-5 h-5 text-amber-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Live Verification Studio</h1>
        {engine && <EngineBadge engine={engine} />}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Left Pane: Input Workspace */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Source Context</label>
            <textarea
              className="w-full h-48 p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Paste the source documents, articles, or database context here..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">LLM Answer to Verify</label>
            <textarea
              className="w-full h-32 p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Paste the generated response here..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Model Name (optional)</label>
            <input
              type="text"
              className="w-full p-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. gpt-4o-mini, gemini-2.0-flash, Custom LLM"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Tags this run for the Analytics model-performance matrix.</p>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-3 rounded-lg text-sm flex items-start">
              <WifiOff className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}

          <button
            onClick={handleVerify}
            disabled={isProcessing || !context || !answer}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <><Loader2 className="animate-spin w-5 h-5 mr-2" /> Processing Pipeline...</>
            ) : (
              'Run SAFE-RAG Verification'
            )}
          </button>
        </div>

        {/* Right Pane: Results View */}
        <div className="bg-gray-100 dark:bg-gray-950 p-6 rounded-xl border border-gray-200 dark:border-gray-800 overflow-y-auto h-[700px]">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Decomposed Claims & Verdicts</h2>

          {!results && !isProcessing && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-600">
              <PlaySquare className="w-12 h-12 mb-2 opacity-50" />
              <p>Run verification to see claim analysis.</p>
            </div>
          )}

          {isProcessing && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse bg-white dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-800 h-24"></div>
              ))}
            </div>
          )}

          {results && (
            <div className="space-y-4">
              {results.map((claim) => (
                <div
                  key={claim.id}
                  className={`p-4 rounded-lg border transition-all cursor-pointer hover:shadow-md ${getVerdictColors(claim.verdict)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex space-x-3">
                      <div className="mt-0.5">{getVerdictIcon(claim.verdict)}</div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{claim.text}</p>
                        {claim.evidence && (
                          <p className="text-sm mt-2 opacity-80">
                            <span className="font-semibold">Evidence:</span> {claim.evidence}
                          </p>
                        )}
                        {claim.error_type && claim.error_type !== 'none' && (
                          <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-full bg-white/50 border border-current">
                            {claim.error_type}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Risk Gauge */}
                    <div className="flex flex-col items-center justify-center ml-4">
                      <div className="relative w-12 h-12 flex items-center justify-center">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="opacity-20" />
                          <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent"
                            strokeDasharray={`${2 * Math.PI * 20}`}
                            strokeDashoffset={`${2 * Math.PI * 20 * (1 - claim.risk_score / 100)}`}
                          />
                        </svg>
                        <span className="absolute text-xs font-bold">{Math.round(claim.risk_score)}%</span>
                      </div>
                      <span className="text-[10px] font-medium uppercase mt-1">Risk</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
