import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  icon: LucideIcon;
  iconColor?: string;
  loading?: boolean;
}

export function StatCard({ label, value, sublabel, icon: Icon, iconColor = 'text-blue-500', loading }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-500 dark:text-gray-400 font-medium text-sm">{label}</h3>
        <Icon className={clsx('w-5 h-5', iconColor)} />
      </div>
      {loading ? (
        <div className="h-9 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
      ) : (
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{value}</p>
      )}
      {sublabel && <span className="text-gray-400 dark:text-gray-500 text-sm font-medium">{sublabel}</span>}
    </div>
  );
}
