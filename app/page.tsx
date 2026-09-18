"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Activity, AlertTriangle, Sparkles, FileText, WifiOff, Inbox, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { getAnalyticsSummary, AnalyticsSummary, Verdict } from '@/lib/api';
import { ERROR_TYPE_COLORS, ERROR_TYPE_LABELS, ERROR_TYPE_ORDER, ENGINE_LABELS, VERDICT_COLORS } from '@/lib/colors';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader } from '@/components/ui/Card';
import { VerdictBadge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

export default function Dashboard() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAnalyticsSummary()
      .then(setSummary)
      .catch(() =>
        setError(
          `Could not reach the SAFE-RAG API at ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}. Start the backend (see backend/README.md).`
        )
      )
      .finally(() => setLoading(false));
  }, []);

  const errorData = summary
    ? ERROR_TYPE_ORDER.filter((key) => summary.error_type_breakdown[key] > 0).map((key) => ({
        key,
        name: ERROR_TYPE_LABELS[key],
        value: summary.error_type_breakdown[key],
      }))
    : [];

  const geminiCount = summary?.engine_breakdown?.gemini ?? 0;
  const totalRuns = summary?.total_verifications ?? 0;
  const geminiShare = totalRuns > 0 ? Math.round((100 * geminiCount) / totalRuns) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="bg-blue-900 text-white p-8 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome to SAFE-RAG</h1>
          <p className="text-blue-200">
            {error ? 'Backend unreachable — start the API server to see live data.' : 'Connected to the verification API.'}
          </p>
        </div>
        <Link href="/studio" className="bg-white text-blue-900 px-6 py-3 rounded-lg font-semibold flex items-center hover:bg-blue-50 transition-colors shrink-0">
          <Search className="w-5 h-5 mr-2" />
          Verify Now
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-center">
          <WifiOff className="w-5 h-5 mr-3 flex-shrink-0" /> {error}
        </div>
      )}

      {/* KPI Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          label="Claims Verified"
          icon={Activity}
          iconColor="text-blue-500"
          loading={loading}
          value={summary?.total_claims ?? 0}
          sublabel={`${totalRuns} verification run${totalRuns === 1 ? '' : 's'}`}
        />

        <StatCard
          label="Hallucination Rate"
          icon={AlertTriangle}
          iconColor="text-amber-500"
          loading={loading}
          value={summary ? `${summary.hallucination_rate}%` : '0%'}
          sublabel="Contradicted + Abstain / total claims"
        />

        <StatCard
          label="Verified by Real LLM"
          icon={Sparkles}
          iconColor="text-violet-500"
          loading={loading}
          value={totalRuns > 0 ? `${geminiShare}%` : '—'}
          sublabel={totalRuns > 0 ? `${geminiCount} of ${totalRuns} runs used Gemini` : 'No runs yet'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity Feed */}
        <Card className="lg:col-span-2">
          <CardHeader title="Recent Verifications" />
          <div className="space-y-3">
            {loading ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)
            ) : summary && summary.recent.length > 0 ? (
              summary.recent.map((record, i) => {
                const counts: Record<Verdict, number> = { Supported: 0, Contradicted: 0, Abstain: 0 };
                record.claims.forEach((c) => {
                  counts[c.verdict] = (counts[c.verdict] || 0) + 1;
                });
                return (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg gap-4">
                    <div className="flex items-center space-x-4 min-w-0">
                      <FileText className="text-gray-400 dark:text-gray-500 w-5 h-5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{record.snippet}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {record.model} · via {record.source} · {ENGINE_LABELS[record.engine] ?? record.engine}
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2 flex-shrink-0">
                      {(Object.keys(counts) as Verdict[])
                        .filter((v) => counts[v] > 0)
                        .map((v) => (
                          <VerdictBadge key={v} verdict={v} count={counts[v]} />
                        ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState icon={Inbox} message="No verifications yet — try the Verification Studio." className="h-40" />
            )}
          </div>
        </Card>

        {/* Error Type Breakdown */}
        <Card>
          <CardHeader title="Error Types" subtitle="Across all claims" />
          <div className="h-56">
            {loading ? (
              <Skeleton className="h-full" />
            ) : errorData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={errorData} innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" nameKey="name">
                    {errorData.map((entry) => (
                      <Cell key={entry.key} fill={ERROR_TYPE_COLORS[entry.key]} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                    iconType="circle"
                    wrapperStyle={{ fontSize: 12, color: '#52514e' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={CheckCircle2} message="No error types caught — everything's clean so far." />
            )}
          </div>
        </Card>
      </div>

      {/* Verdict Breakdown */}
      <VerdictSummary summary={summary} loading={loading} />
    </div>
  );
}

function VerdictSummary({ summary, loading }: { summary: AnalyticsSummary | null; loading: boolean }) {
  const counts: Record<Verdict, number> = { Supported: 0, Contradicted: 0, Abstain: 0 };
  summary?.recent.forEach((r) => r.claims.forEach((c) => (counts[c.verdict] = (counts[c.verdict] || 0) + 1)));
  const total = counts.Supported + counts.Contradicted + counts.Abstain;

  return (
    <Card>
      <CardHeader title="Verdict Mix" subtitle="Across the 10 most recent verification runs" />
      {loading ? (
        <Skeleton className="h-8" />
      ) : total === 0 ? (
        <EmptyState icon={Inbox} message="No verdicts yet." className="h-20" />
      ) : (
        <div className="space-y-3">
          <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800">
            {(Object.keys(counts) as Verdict[]).map((v) =>
              counts[v] > 0 ? (
                <div
                  key={v}
                  style={{ width: `${(100 * counts[v]) / total}%`, backgroundColor: VERDICT_COLORS[v].hex }}
                  title={`${v}: ${counts[v]}`}
                />
              ) : null
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {(Object.keys(counts) as Verdict[]).map((v) => (
              <VerdictBadge key={v} verdict={v} count={counts[v]} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
