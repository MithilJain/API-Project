import { CheckCircle2, AlertCircle, HelpCircle } from 'lucide-react';
import clsx from 'clsx';
import type { Verdict } from '@/lib/api';
import { VERDICT_COLORS } from '@/lib/colors';

const VERDICT_ICONS: Record<Verdict, typeof CheckCircle2> = {
  Supported: CheckCircle2,
  Contradicted: AlertCircle,
  Abstain: HelpCircle,
};

export function VerdictBadge({ verdict, count }: { verdict: Verdict; count?: number }) {
  const colors = VERDICT_COLORS[verdict];
  const Icon = VERDICT_ICONS[verdict];
  return (
    <span
      className={clsx(
        'px-3 py-1 text-xs font-semibold rounded-full flex items-center gap-1 border',
        colors.bg,
        colors.text,
        colors.border
      )}
    >
      <Icon className="w-3 h-3" /> {count !== undefined ? count : verdict}
    </span>
  );
}

export function EngineBadge({ engine }: { engine: string }) {
  return (
    <span className="text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
      Engine: {engine.replace(/_/g, ' ')}
    </span>
  );
}
