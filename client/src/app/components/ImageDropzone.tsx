import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, Link as LinkIcon, Check } from 'lucide-react';
import api from '../../services/api';

interface ImageDropzoneProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  aspectRatio?: 'video' | 'square' | 'banner' | 'auto';
  placeholderText?: string;
  helperText?: string;
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({
  value = '',
  onChange,
  label,
  aspectRatio = 'auto',
  placeholderText = 'Drag & drop image here, or click to browse',
  helperText = 'Supports PNG, JPG, WebP, SVG up to 10MB',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [manualUrl, setManualUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, WebP, SVG).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const res = await api.post('/cms/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.url) {
        onChange(res.data.url);
      }
    } catch (err: any) {
      console.error('Image upload failed:', err);
      // Fallback: convert to base64 if server upload fails
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onChange(reader.result);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await uploadFile(file);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await uploadFile(file);
    }
  };

  const handleManualUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualUrl.trim()) {
      onChange(manualUrl.trim());
      setManualUrl('');
      setShowUrlInput(false);
    }
  };

  const aspectClass =
    aspectRatio === 'video'
      ? 'aspect-video'
      : aspectRatio === 'square'
      ? 'aspect-square max-w-[200px]'
      : aspectRatio === 'banner'
      ? 'aspect-[21/9]'
      : 'min-h-[140px]';

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
            {label}
          </label>
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            className="text-[11px] text-brand-700 dark:text-brand-400 hover:underline flex items-center gap-1 font-semibold"
          >
            <LinkIcon className="w-3 h-3" />
            <span>{showUrlInput ? 'Cancel URL' : 'Or paste URL'}</span>
          </button>
        </div>
      )}

      {/* Manual URL Input */}
      {showUrlInput && (
        <div className="flex gap-2">
          <input
            type="url"
            value={manualUrl}
            onChange={(e) => setManualUrl(e.target.value)}
            placeholder="https://images.unsplash.com/photo-..."
            className="flex-1 p-2 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs"
          />
          <button
            type="button"
            onClick={handleManualUrlSubmit}
            className="px-3 py-1.5 bg-brand-800 text-white rounded-xl text-xs font-bold"
          >
            Apply
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Dropzone Area or Preview */}
      {value ? (
        <div className="relative group rounded-2xl overflow-hidden border-2 border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
          <img
            src={value}
            alt="Uploaded Preview"
            className={`w-full object-cover ${aspectClass}`}
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=600&q=80';
            }}
          />

          {/* Action overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-white text-stone-900 rounded-xl text-xs font-bold hover:bg-stone-100 flex items-center gap-1.5 shadow"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Replace Image</span>
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 shadow"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] font-mono px-2 py-0.5 rounded backdrop-blur-sm truncate max-w-[80%]">
            {value.split('/').pop() || 'image'}
          </div>
        </div>
      ) : (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${aspectClass} flex flex-col items-center justify-center ${
            isDragging
              ? 'border-brand-600 bg-brand-50/60 dark:bg-brand-950/40 scale-[1.01]'
              : 'border-stone-300 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50 hover:bg-stone-100 dark:hover:bg-stone-900 hover:border-brand-500'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
              <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                Uploading image...
              </p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-brand-100 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 flex items-center justify-center mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                {placeholderText}
              </p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                {helperText}
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-rose-600 font-semibold">{error}</p>
      )}
    </div>
  );
};

export default ImageDropzone;

