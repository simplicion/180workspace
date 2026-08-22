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
  let colorClass = 'bg-primary';
  if (percentage >= 90) {
    colorClass = 'bg-destructive';
  } else if (percentage >= 75) {
    colorClass = 'bg-yellow-500'; // Make sure to use a valid tailwind class
  }

  const displayCurrent = formattedCurrent !== undefined ? formattedCurrent : current;
  const displayMax = formattedMax !== undefined ? formattedMax : (max === 999999 ? 'Unlimited' : max);

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex justify-between text-sm font-medium">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {displayCurrent} / {displayMax} {unit}
        </span>
      </div>
      <Progress value={percentage} indicatorClassName={colorClass} className="h-2" />
    </div>
  );
}
