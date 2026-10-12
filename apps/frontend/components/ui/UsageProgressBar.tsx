import * as React from 'react';
import { Progress } from './progress';
import { cn } from '@/lib/utils';

export interface UsageProgressBarProps {
  label: string;
  current: number;
  max: number;
  formattedCurrent?: string;
  formattedMax?: string;
  unit?: string;
  className?: string;
}

export function UsageProgressBar({ label, current, max, formattedCurrent, formattedMax, unit = '', className }: UsageProgressBarProps) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (current / max) * 100)) : 0;
  
  // Choose color based on usage
  let colorClass = 'bg-indigo-600 dark:bg-indigo-500';
  if (percentage >= 90) {
    colorClass = 'bg-rose-600 dark:bg-rose-500';
  } else if (percentage >= 75) {
    colorClass = 'bg-amber-500 dark:bg-amber-400';
  }

  const displayCurrent = formattedCurrent !== undefined ? formattedCurrent : current;
  const displayMax = formattedMax !== undefined ? formattedMax : (max === 999999 ? 'Unlimited' : max);

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex justify-between items-center text-xs sm:text-sm font-medium">
        <span className="text-gray-900 dark:text-zinc-200 font-medium">{label}</span>
        <span className="text-gray-500 dark:text-zinc-400 font-mono text-xs font-semibold">
          {displayCurrent} / {displayMax} {unit}
        </span>
      </div>
      <Progress 
        value={percentage} 
        indicatorClassName={colorClass} 
        className="h-2 bg-gray-100 dark:bg-zinc-800/90 rounded-full overflow-hidden border border-gray-200/50 dark:border-zinc-800" 
      />
    </div>
  );
}
