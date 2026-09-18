"use client";

import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { TrendingDown, ShieldAlert, Binary, WifiOff, Cpu } from 'lucide-react';
import { getAnalyticsTimeseries, getAnalyticsSummary, getModelStats, TimeseriesPoint, ModelStat, AnalyticsSummary } from '@/lib/api';
import { ERROR_TYPE_COLORS, ERROR_TYPE_LABELS, ERROR_TYPE_ORDER, ENGINE_LABELS, ENGINE_COLORS } from '@/lib/colors';
import { Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

export default function Analytics() {
  const [timeSeriesData, setTimeSeriesData] = useState<TimeseriesPoint[]>([]);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [modelStats, setModelStats] = useState<ModelStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getAnalyticsTimeseries(), getAnalyticsSummary(), getModelStats()])
      .then(([ts, s, models]) => {
        setTimeSeriesData(ts);
        setSummary(s);
        setModelStats(models);
      })
      .catch(() => setError('Could not reach the SAFE-RAG API. Run some verifications first, or start the backend.'))
      .finally(() => setLoading(false));
  }, []);

  const errorsData = summary
    ? ERROR_TYPE_ORDER.filter((key) => summary.error_type_breakdown[key] > 0).map((key) => ({
        key,
        module: ERROR_TYPE_LABELS[key],
        caught: summary.error_type_breakdown[key],
      }))
    : [];

  const engineEntries = summary ? Object.entries(summary.engine_breakdown).filter(([, v]) => v > 0) : [];
  const engineTotal = engineEntries.reduce((sum, [, v]) => sum + v, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Analytics & Insights</h1>
        <p className="text-gray-500 dark:text-gray-400">Deep-dive reporting for compliance and AI development teams, built from real verification runs.</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 p-4 rounded-xl flex items-center">
          <WifiOff className="w-5 h-5 mr-3 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Time-Series Graph */}
        <Card>
          <CardHeader icon={<TrendingDown className="w-5 h-5 text-blue-500" />} title="Hallucination Rate Over Time (%)" />
          <div className="h-64">
            {loading ? (
              <Skeleton className="h-full" />
            ) : timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e0d9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#898781', fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#898781', fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line type="monotone" dataKey="rate" stroke="#2a78d6" strokeWidth={2} dot={{ r: 4, fill: '#2a78d6' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={TrendingDown} message="No data yet — run some verifications." />
            )}
          </div>
        </Card>

        {/* Error Type Deep-Dive */}
        <Card>
          <CardHeader icon={<Binary className="w-5 h-5 text-violet-500" />} title="Error Type Breakdown" />
          <div className="h-64">
            {loading ? (
              <Skeleton className="h-full" />
            ) : errorsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={errorsData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e1e0d9" />
                  <XAxis type="number" axisLine={false} tickLine={false} allowDecimals={false} tick={{ fill: '#898781', fontSize: 12 }} />
                  <YAxis dataKey="module" type="category" axisLine={false} tickLine={false} tick={{ fill: '#52514e', fontSize: 13 }} />
                  <Tooltip cursor={{ fill: '#f9f9f7' }} />
                  <Bar dataKey="caught" radius={[0, 4, 4, 0]} barSize={24}>
                    {errorsData.map((entry) => (
                      <Cell key={entry.key} fill={ERROR_TYPE_COLORS[entry.key]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={Binary} message="No errors caught yet." />
            )}
          </div>
        </Card>
      </div>

      {/* Engine Mix */}
      <Card>
        <CardHeader icon={<Cpu className="w-5 h-5 text-blue-500" />} title="Verification Engine Mix" subtitle="Gemini (real LLM judgment) vs. the deterministic rule-based fallback" />
        {loading ? (
          <Skeleton className="h-8" />
        ) : engineTotal === 0 ? (
          <EmptyState icon={Cpu} message="No verification runs yet." className="h-16" />
        ) : (
          <div className="space-y-3">
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800">
              {engineEntries.map(([engine, count]) => (
                <div
                  key={engine}
                  style={{ width: `${(100 * count) / engineTotal}%`, backgroundColor: ENGINE_COLORS[engine] ?? ENGINE_COLORS.unknown }}
                  title={`${ENGINE_LABELS[engine] ?? engine}: ${count}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              {engineEntries.map(([engine, count]) => (
                <div key={engine} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ENGINE_COLORS[engine] ?? ENGINE_COLORS.unknown }} />
                  <span className="text-gray-700 dark:text-gray-300 font-medium">{ENGINE_LABELS[engine] ?? engine}</span>
                  <span className="text-gray-400 dark:text-gray-500">
                    {count} run{count === 1 ? '' : 's'} ({Math.round((100 * count) / engineTotal)}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Model Performance Matrix */}
      <Card>
        <CardHeader icon={<ShieldAlert className="w-5 h-5 text-amber-500" />} title="Model Performance Matrix" />
        <div className="overflow-x-auto">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : modelStats.length > 0 ? (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3 rounded-tl-lg">LLM Model</th>
                  <th className="px-6 py-3">Total Claims</th>
                  <th className="px-6 py-3">Verdict Mix</th>
                  <th className="px-6 py-3 rounded-tr-lg text-right">Supported</th>
                </tr>
              </thead>
              <tbody>
                {modelStats.map((m, i) => (
                  <tr key={m.model} className={i % 2 ? 'bg-gray-50 dark:bg-gray-800/50' : 'border-b border-gray-100 dark:border-gray-800'}>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-gray-100">{m.model}</td>
                    <td className="px-6 py-4 tabular-nums dark:text-gray-300">{m.total}</td>
                    <td className="px-6 py-4">
                      <div className="w-40 h-2 rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800">
                        <div style={{ width: `${m.supported_rate}%`, backgroundColor: '#0ca30c' }} title={`Supported ${m.supported_rate}%`} />
                        <div style={{ width: `${m.contradicted_rate}%`, backgroundColor: '#d03b3b' }} title={`Contradicted ${m.contradicted_rate}%`} />
                        <div style={{ width: `${m.abstain_rate}%`, backgroundColor: '#fab219' }} title={`Abstain ${m.abstain_rate}%`} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-green-600 dark:text-green-400 font-medium tabular-nums text-right">{m.supported_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              No verifications yet. Tag your LLM outputs with a model name in the Studio to populate this table.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
