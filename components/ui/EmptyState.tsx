import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  message: string;
  className?: string;
}

export function EmptyState({ icon: Icon, message, className = 'h-full' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 ${className}`}>
      <Icon className="w-8 h-8 mb-2 opacity-50" />
      <p className="text-sm text-center px-4">{message}</p>
    </div>
  );
}
