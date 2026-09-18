import type { CSSProperties } from 'react';

export function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <div className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded ${className}`} style={style} />;
}

export function ChartSkeleton() {
  return (
    <div className="h-full flex items-end justify-between gap-2 px-2 pb-2">
      {[40, 70, 45, 90, 60, 75, 50].map((h, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}
