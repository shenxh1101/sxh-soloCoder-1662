import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  Camera,
  CalendarDays,
  Package,
  Image as ImageIcon,
  Upload,
  X,
  FileImage,
  ChevronDown,
  Check,
  Loader2,
} from 'lucide-react';
import { api } from '@/api/client';
import type { Order, Photographer } from '@shared/types';
import { cn } from '@/lib/utils';
import Layout from '@/components/Layout';

interface FormData {
  customerName: string;
  customerPhone: string;
  photographerId: string;
  shootDate: string;
  packageName: string;
  albumCount: number;
  retouchCount: number;
}

export default function OrderNew() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [showPhotographerDropdown, setShowPhotographerDropdown] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    customerName: '',
    customerPhone: '',
    photographerId: '',
    shootDate: '',
    packageName: '',
    albumCount: 20,
    retouchCount: 30,
  });
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  useEffect(() => {
    api.getPhotographers().then(setPhotographers).catch(() => {});
  }, []);

  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    if (!formData.customerName.trim()) newErrors.customerName = '请输入客户姓名';
    if (!formData.customerPhone.trim()) newErrors.customerPhone = '请输入手机号';
    else if (!/^1[3-9]\d{9}$/.test(formData.customerPhone)) newErrors.customerPhone = '手机号格式不正确';
    if (!formData.photographerId) newErrors.photographerId = '请选择摄影顾问';
    if (!formData.shootDate) newErrors.shootDate = '请选择拍摄日期';
    if (!formData.packageName.trim()) newErrors.packageName = '请输入套餐名称';
    if (formData.albumCount <= 0) newErrors.albumCount = '入册张数必须大于0';
    if (formData.retouchCount <= 0) newErrors.retouchCount = '精修张数必须大于0';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    const imageFiles = Array.from(newFiles).filter((f) => f.type.startsWith('image/'));
    setFiles((prev) => [...prev, ...imageFiles]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const order: Order = await api.createOrder({
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        photographerId: formData.photographerId,
        shootDate: formData.shootDate,
        packageName: formData.packageName.trim(),
        albumCount: formData.albumCount,
        retouchCount: formData.retouchCount,
      });

      if (files.length > 0) {
        setUploading(true);
        setUploadProgress(0);
        await api.uploadPhotos(order.id, files, (done, total) => {
          setUploadProgress(Math.round((done / total) * 100));
        });
      }

      navigate(`/orders/${order.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建订单失败');
      setSubmitting(false);
      setUploading(false);
    }
  };

  const selectedPhotographer = photographers.find((p) => p.id === formData.photographerId);

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center gap-4">
        <button onClick={() => navigate('/orders')} className="btn-ghost p-2">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-display text-3xl font-semibold text-ink-charcoal">新建订单</h1>
          <p className="text-sm text-ink-warm mt-0.5">填写客户信息并上传照片</p>
        </div>
      </div>

      <div className="card-gold p-6 md:p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-champagne-400 to-champagne-500 flex items-center justify-center text-white">
            <User className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-charcoal">客户信息</h2>
            <p className="text-xs text-ink-warm">请填写客户的基本信息</p>
          </div>
        </div>

        <div className="gold-divider mb-6" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="input-label">
              <User className="w-4 h-4 inline mr-1.5 -mt-0.5 text-champagne-500" />
              客户姓名
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => updateField('customerName', e.target.value)}
              placeholder="请输入客户姓名"
              className={cn('input-field', errors.customerName && 'border-red-300 focus:ring-red-300/50')}
            />
            {errors.customerName && <p className="text-xs text-red-500 mt-1">{errors.customerName}</p>}
          </div>

          <div>
            <label className="input-label">
              <Phone className="w-4 h-4 inline mr-1.5 -mt-0.5 text-champagne-500" />
              手机号码
            </label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => updateField('customerPhone', e.target.value)}
              placeholder="请输入手机号码"
              className={cn('input-field', errors.customerPhone && 'border-red-300 focus:ring-red-300/50')}
            />
            {errors.customerPhone && <p className="text-xs text-red-500 mt-1">{errors.customerPhone}</p>}
          </div>

          <div className="relative">
            <label className="input-label">
              <Camera className="w-4 h-4 inline mr-1.5 -mt-0.5 text-champagne-500" />
              摄影顾问
            </label>
            <button
              type="button"
              onClick={() => setShowPhotographerDropdown(!showPhotographerDropdown)}
              className={cn(
                'input-field flex items-center justify-between text-left',
                errors.photographerId && 'border-red-300 focus:ring-red-300/50',
                !selectedPhotographer && 'text-ink-warm/40'
              )}
            >
              <span>{selectedPhotographer ? selectedPhotographer.name : '请选择摄影顾问'}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {errors.photographerId && <p className="text-xs text-red-500 mt-1">{errors.photographerId}</p>}
            {showPhotographerDropdown && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl border border-champagne-200 shadow-soft z-20 py-1.5 max-h-56 overflow-auto">
                {photographers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      updateField('photographerId', p.id);
                      setShowPhotographerDropdown(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm hover:bg-cream transition-colors flex items-center justify-between',
                      formData.photographerId === p.id && 'text-champagne-700 bg-champagne-50'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-champagne-100 flex items-center justify-center">
                        <Camera className="w-3 h-3 text-champagne-600" />
                      </div>
                      {p.name}
                    </span>
                    {formData.photographerId === p.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="input-label">
              <CalendarDays className="w-4 h-4 inline mr-1.5 -mt-0.5 text-champagne-500" />
              拍摄日期
            </label>
            <input
              type="date"
              value={formData.shootDate}
              onChange={(e) => updateField('shootDate', e.target.value)}
              className={cn('input-field', errors.shootDate && 'border-red-300 focus:ring-red-300/50')}
            />
            {errors.shootDate && <p className="text-xs text-red-500 mt-1">{errors.shootDate}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="input-label">
              <Package className="w-4 h-4 inline mr-1.5 -mt-0.5 text-champagne-500" />
              套餐名称
            </label>
            <input
              type="text"
              value={formData.packageName}
              onChange={(e) => updateField('packageName', e.target.value)}
              placeholder="如：经典婚纱套餐A、全家福豪华套餐等"
              className={cn('input-field', errors.packageName && 'border-red-300 focus:ring-red-300/50')}
            />
            {errors.packageName && <p className="text-xs text-red-500 mt-1">{errors.packageName}</p>}
          </div>

          <div>
            <label className="input-label">
              <ImageIcon className="w-4 h-4 inline mr-1.5 -mt-0.5 text-champagne-500" />
              入册张数
            </label>
            <input
              type="number"
              min="1"
              value={formData.albumCount}
              onChange={(e) => updateField('albumCount', parseInt(e.target.value) || 0)}
              className={cn('input-field', errors.albumCount && 'border-red-300 focus:ring-red-300/50')}
            />
            {errors.albumCount && <p className="text-xs text-red-500 mt-1">{errors.albumCount}</p>}
          </div>

          <div>
            <label className="input-label">
              <FileImage className="w-4 h-4 inline mr-1.5 -mt-0.5 text-champagne-500" />
              精修张数
            </label>
            <input
              type="number"
              min="1"
              value={formData.retouchCount}
              onChange={(e) => updateField('retouchCount', parseInt(e.target.value) || 0)}
              className={cn('input-field', errors.retouchCount && 'border-red-300 focus:ring-red-300/50')}
            />
            {errors.retouchCount && <p className="text-xs text-red-500 mt-1">{errors.retouchCount}</p>}
          </div>
        </div>
      </div>

      <div className="card-gold p-6 md:p-8 mb-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-champagne-400 to-champagne-500 flex items-center justify-center text-white">
            <Upload className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-charcoal">照片上传</h2>
            <p className="text-xs text-ink-warm">拖拽或点击上传拍摄原片</p>
          </div>
        </div>

        <div className="gold-divider mb-6" />

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200',
            dragOver
              ? 'border-champagne-400 bg-champagne-50/50 scale-[1.01]'
              : 'border-champagne-200 bg-ivory/30 hover:border-champagne-300 hover:bg-cream/50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-champagne-400 to-champagne-500 flex items-center justify-center text-white mx-auto mb-4">
            <Upload className="w-7 h-7" />
          </div>
          <p className="font-medium text-ink-charcoal mb-1">
            {dragOver ? '松开鼠标上传照片' : '点击或拖拽照片到此处'}
          </p>
          <p className="text-sm text-ink-warm">支持 JPG、PNG 等图片格式，可批量上传</p>
        </div>

        {files.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-ink-charcoal">
                已选择 {files.length} 张照片
              </span>
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-sm text-ink-warm hover:text-red-500 transition-colors"
              >
                清空全部
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {files.map((file, index) => (
                <div key={index} className="relative group aspect-square rounded-xl overflow-hidden bg-cream">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                    <p className="text-xs text-white truncate">{file.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {uploading && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-ink-charcoal flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-champagne-500" />
                正在上传照片...
              </span>
              <span className="text-sm text-champagne-700 font-medium">{uploadProgress}%</span>
            </div>
            <div className="relative h-3 rounded-full bg-cream overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-champagne-400 to-champagne-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={() => navigate('/orders')} className="btn-secondary" disabled={submitting}>
          取消
        </button>
        <button onClick={handleSubmit} className="btn-primary flex items-center gap-2" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="w-4.5 h-4.5 animate-spin" />
              {uploading ? '上传中...' : '提交中...'}
            </>
          ) : (
            <>
              <Check className="w-4.5 h-4.5" />
              提交订单
            </>
          )}
        </button>
      </div>
      </div>
    </Layout>
  );
}
