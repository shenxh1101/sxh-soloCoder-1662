import type { OrderStatus, StatusLog } from '@shared/types';
import { PRODUCTION_STATUSES, ORDER_STATUS_LABELS, ORDER_STATUS_STEP } from '@shared/types';
import { cn } from '@/lib/utils';

interface ProgressTimelineProps {
  status: OrderStatus;
  statusHistory: StatusLog[];
}

export default function ProgressTimeline({ status, statusHistory }: ProgressTimelineProps) {
  const currentStep = ORDER_STATUS_STEP[status];

  const getTimestamp = (targetStatus: OrderStatus): string | null => {
    const log = statusHistory.find((s) => s.status === targetStatus);
    if (!log?.timestamp) return null;
    const date = new Date(log.timestamp);
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="py-4">
      <div className="relative flex items-center justify-between">
        <div className="absolute top-5 left-0 right-0 h-0.5 mx-12 bg-champagne-200" />
        <div
          className="absolute top-5 left-12 h-0.5 bg-gradient-to-r from-champagne-400 to-champagne-500 transition-all duration-500"
          style={{
            width: `${currentStep >= 5 ? 100 : currentStep > 0 ? ((currentStep - 1) / (PRODUCTION_STATUSES.length - 1)) * 100 : 0}%`,
            maxWidth: 'calc(100% - 6rem)',
          }}
        />

        {PRODUCTION_STATUSES.map((s, index) => {
          const step = ORDER_STATUS_STEP[s];
          const isCompleted = currentStep > step || (currentStep === step && s === 'completed');
          const isCurrent = currentStep === step && s !== 'completed';
          const timestamp = getTimestamp(s);

          return (
            <div key={s} className="relative z-10 flex flex-col items-center" style={{ flex: 1 }}>
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                  isCompleted
                    ? 'bg-gradient-to-br from-champagne-400 to-champagne-600 border-champagne-500 shadow-soft'
                    : isCurrent
                    ? 'bg-white border-champagne-500 animate-pulse-glow'
                    : 'bg-white border-champagne-200'
                )}
              >
                {isCompleted ? (
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span
                    className={cn(
                      'text-sm font-semibold',
                      isCurrent ? 'text-champagne-600' : 'text-champagne-300'
                    )}
                  >
                    {index + 1}
                  </span>
                )}
              </div>
              <div
                className={cn(
                  'mt-2 text-xs font-medium text-center',
                  isCompleted ? 'text-champagne-700' : isCurrent ? 'text-champagne-600' : 'text-ink-warm'
                )}
              >
                {ORDER_STATUS_LABELS[s]}
              </div>
              {timestamp && (
                <div className="mt-0.5 text-[10px] text-ink-warm/60">{timestamp}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
