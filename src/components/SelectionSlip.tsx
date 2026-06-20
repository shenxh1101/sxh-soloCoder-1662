import { Album, Wand2, Ban, MessageSquare, Tag, Printer } from 'lucide-react';
import type { Photo, PhotoMark, Order } from '@shared/types';
import { PHOTO_MARK_LABELS } from '@shared/types';
import { cn } from '@/lib/utils';

interface SelectionSlipProps {
  order: Order;
  photos?: Photo[];
  showPrint?: boolean;
  compact?: boolean;
  className?: string;
}

function getMarkBadgeClass(mark: PhotoMark | null) {
  if (mark === 'album') return 'bg-champagne-50 text-champagne-700 border-champagne-200';
  if (mark === 'retouch') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  return 'bg-ink-warm/10 text-ink-warm border-ink-warm/20';
}

function getMarkIcon(mark: PhotoMark | null) {
  if (mark === 'album') return <Album className="w-3 h-3" />;
  if (mark === 'retouch') return <Wand2 className="w-3 h-3" />;
  return <Ban className="w-3 h-3" />;
}

export default function SelectionSlip({
  order,
  photos,
  showPrint = false,
  compact = false,
  className = '',
}: SelectionSlipProps) {
  const targetPhotos = photos || order.photos;
  const albumPhotos = targetPhotos.filter((p) => p.mark === 'album');
  const retouchPhotos = targetPhotos.filter((p) => p.mark === 'retouch');
  const nonePhotos = targetPhotos.filter((p) => p.mark === 'none' || p.mark === null);
  const remarks = targetPhotos.filter((p) => p.remark);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('请允许弹出窗口以打印确认单');
      return;
    }

    const remarkRows = remarks
      .map(
        (p) => `
        <tr>
          <td class="remark-filename">${p.filename}</td>
          <td class="remark-mark">${PHOTO_MARK_LABELS[(p.mark as PhotoMark) || 'none']}</td>
          <td class="remark-text">${p.remark}</td>
        </tr>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
        <meta charset="UTF-8">
        <title>选片确认单 - ${order.orderNo}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Noto Sans SC', sans-serif;
            color: #2D2A26;
            padding: 40px;
            background: #fff;
          }
          .slip-header { text-align: center; margin-bottom: 32px; }
          .slip-title {
            font-family: 'Playfair Display', serif;
            font-size: 28px;
            font-weight: 600;
            color: #2D2A26;
            margin-bottom: 8px;
          }
          .slip-subtitle {
            font-size: 13px;
            color: #8B8179;
          }
          .divider {
            height: 1px;
            background: linear-gradient(to right, transparent, #D4C5A9, transparent);
            margin: 20px 0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
          }
          .info-item { text-align: center; }
          .info-label {
            font-size: 12px;
            color: #8B8179;
            margin-bottom: 4px;
          }
          .info-value {
            font-size: 20px;
            font-weight: 600;
            font-family: 'Playfair Display', serif;
          }
          .info-album { color: #C9A961; }
          .info-retouch { color: #6366F1; }
          .info-none { color: #9CA3AF; }
          .section-title {
            font-size: 14px;
            font-weight: 600;
            color: #2D2A26;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .remark-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
          }
          .remark-table th {
            text-align: left;
            padding: 10px 12px;
            background: #FAF6F1;
            font-weight: 600;
            color: #2D2A26;
            font-size: 12px;
            border-bottom: 1px solid #E5D9C5;
          }
          .remark-table td {
            padding: 10px 12px;
            border-bottom: 1px solid #F5EFE6;
          }
          .remark-filename {
            font-family: monospace;
            font-size: 12px;
            color: #6B6158;
          }
          .remark-mark {
            font-size: 12px;
            font-weight: 500;
            color: #C9A961;
          }
          .remark-text { color: #2D2A26; }
          .footer {
            margin-top: 48px;
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #8B8179;
          }
          .sign-line {
            width: 150px;
            border-bottom: 1px solid #2D2A26;
            padding-top: 40px;
            text-align: center;
          }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="slip-header">
          <div class="slip-title">选片确认单</div>
          <div class="slip-subtitle">
            订单号：${order.orderNo} ｜ 客户：${order.customer.name} ｜ 摄影顾问：${order.photographerName || '未指派'}
          </div>
        </div>

        <div class="divider"></div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">入册照片</div>
            <div class="info-value info-album">${albumPhotos.length} 张</div>
          </div>
          <div class="info-item">
            <div class="info-label">精修照片</div>
            <div class="info-value info-retouch">${retouchPhotos.length} 张</div>
          </div>
          <div class="info-item">
            <div class="info-label">不选照片</div>
            <div class="info-value info-none">${nonePhotos.length} 张</div>
          </div>
        </div>

        <div class="divider"></div>

        <div class="section-title">📝 修图备注汇总（共 ${remarks.length} 条）</div>
        ${
          remarks.length === 0
            ? '<p style="color:#8B8179; font-size:13px; padding:16px 0;">暂无修图备注</p>'
            : `
        <table class="remark-table">
          <thead>
            <tr>
              <th style="width:40%">照片文件名</th>
              <th style="width:15%">选片标记</th>
              <th style="width:45%">备注内容</th>
            </tr>
          </thead>
          <tbody>
            ${remarkRows}
          </tbody>
        </table>
        `
        }

        <div class="footer">
          <div>
            <div class="sign-line">客户签字</div>
            <div style="margin-top:6px;">日期：____________</div>
          </div>
          <div>
            <div class="sign-line">工作室确认</div>
            <div style="margin-top:6px;">日期：____________</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className={cn('selection-slip', className)}>
      {showPrint && (
        <button onClick={handlePrint} className="btn-secondary flex items-center gap-2 mb-4 no-print">
          <Printer className="w-4 h-4" />
          打印确认单
        </button>
      )}

      {!compact && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="p-4 rounded-xl bg-gradient-to-br from-champagne-50 to-champagne-100/50 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Album className="w-4 h-4 text-champagne-600" />
              <span className="text-xs text-champagne-700">入册</span>
            </div>
            <div className="font-display text-2xl font-semibold text-champagne-700">
              {albumPhotos.length}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100/50 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Wand2 className="w-4 h-4 text-indigo-600" />
              <span className="text-xs text-indigo-700">精修</span>
            </div>
            <div className="font-display text-2xl font-semibold text-indigo-700">
              {retouchPhotos.length}
            </div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100/50 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Ban className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-600">不选</span>
            </div>
            <div className="font-display text-2xl font-semibold text-gray-600">
              {nonePhotos.length}
            </div>
          </div>
        </div>
      )}

      {remarks.length > 0 && (
        <>
          <div className="gold-divider mb-4" />
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-champagne-500" />
            <span className="text-sm font-medium text-ink-charcoal">修图备注汇总</span>
            <span className="text-xs text-ink-warm ml-auto">共 {remarks.length} 条</span>
          </div>
          <div className="space-y-2 max-h-64 overflow-auto pr-2 scrollbar-thin">
            {remarks.map((p) => (
              <div key={p.id} className="p-3 rounded-lg bg-cream/50">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Tag className="w-3.5 h-3.5 text-champagne-500 shrink-0" />
                  <span className="text-xs font-medium text-ink-charcoal">{p.filename}</span>
                  {p.mark && (
                    <span className={cn('badge border text-[10px]', getMarkBadgeClass(p.mark))}>
                      {getMarkIcon(p.mark)}
                      {PHOTO_MARK_LABELS[p.mark]}
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-warm pl-5.5">{p.remark}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
