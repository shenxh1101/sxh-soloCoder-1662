import type { OrderStatus } from '@shared/types';
import { ORDER_STATUS_LABELS } from '@shared/types';
import { cn } from '@/lib/utils';

const statusStyles: Record<OrderStatus, string> = {
  pending_selection: 'bg-gray-100 text-gray-600 border-gray-200',
  selecting: 'bg-blue-50 text-blue-600 border-blue-200',
  selected: 'bg-teal-50 text-teal-600 border-teal-200',
  retouching: 'bg-orange-50 text-orange-600 border-orange-200',
  layouting: 'bg-purple-50 text-purple-600 border-purple-200',
  producing: 'bg-amber-50 text-amber-700 border-amber-200',
  shipping: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  completed: 'bg-champagne-50 text-champagne-700 border-champagne-200',
};

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'badge border',
        statusStyles[status],
        className
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
