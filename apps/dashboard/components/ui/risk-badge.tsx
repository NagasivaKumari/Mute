import { cn } from '../../lib/utils';
import { riskLevelStyle } from '../../lib/utils';

interface RiskBadgeProps {
  level?: string;
  className?: string;
}

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const style = riskLevelStyle(level);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        style.bg,
        style.text,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', style.dot)} />
      {style.label}
    </span>
  );
}
