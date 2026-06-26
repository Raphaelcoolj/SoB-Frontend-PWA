'use client';

/**
 * @file page.tsx (create)
 * @description Unified content creation page.
 */

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FileText, MessageSquare, Image as ImageIcon, Video } from 'lucide-react';
import useSWR from 'swr';
import { useAuthStore } from '../../../store/authStore';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import MediaUploader from '../../../components/post/MediaUploader';
import VideoTrimmerModal from '../../../components/post/VideoTrimmerModal';
import ImageCropperModal from '../../../components/post/ImageCropperModal';
import ContentEditor from '../../../components/post/ContentEditor';
import { toast } from 'sonner';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const fetcher = (url: string) => fetch(url).then(r => r.json()).then(d => d.data);

type ContentMode = 'post' | 'article';

const postSchema = z.object({
  // NEW: Make post body optional to allow media-only posts
  body: z.string().max(200, 'Posts cannot exceed 200 characters').optional().or(z.literal('')),
});

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');

const articleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  body: z.string().min(1, 'Content is required').refine(
    (val) => stripHtml(val).length <= 10000,
    'Articles cannot exceed 10000 characters'
  ),
  field: z.string().min(1, 'Field is required'),
});

// NEW: Helper to validate video duration is 60 seconds or less
const validateVideoDuration = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!file.type.startsWith('video/')) {
      resolve(true);
      return;
    }
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration <= 60);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(false);
    };
  });
};

export default function CreatePage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();
  const [mode, setMode] = useState<ContentMode>('post');
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const [isSensitive, setIsSensitive] = useState(false);
  const [trimmingFile, setTrimmingFile] = useState<File | null>(null);
  const [trimmingIndex, setTrimmingIndex] = useState<number | null>(null);
  const [isTrimmerOpen, setIsTrimmerOpen] = useState(false);
  const [croppingFile, setCroppingFile] = useState<File | null>(null);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTrimComplete = (trimmedFile: File) => {
    setIsTrimmerOpen(false);
    if (trimmingIndex !== null) {
      setImages(prev => {
        const next = [...prev];
        next[trimmingIndex] = trimmedFile;
        return next;
      });
      setImagePreviews(prev => {
        const next = [...prev];
        URL.revokeObjectURL(next[trimmingIndex]);
        next[trimmingIndex] = URL.createObjectURL(trimmedFile);
        return next;
      });
      toast.success('Video trimmed successfully!');
    } else {
      setImages(prev => [...prev, trimmedFile]);
      setImagePreviews(prev => [...prev, URL.createObjectURL(trimmedFile)]);
      toast.success('Video trimmed and added!');
    }
    setTrimmingFile(null);
    setTrimmingIndex(null);
  };

  const handleCropComplete = (croppedFile: File) => {
    setIsCropperOpen(false);
    if (croppingIndex !== null) {
      setImages(prev => {
        const next = [...prev];
        next[croppingIndex] = croppedFile;
        return next;
      });
      setImagePreviews(prev => {
        const next = [...prev];
        URL.revokeObjectURL(next[croppingIndex]);
        next[croppingIndex] = URL.createObjectURL(croppedFile);
        return next;
      });
      toast.success('Image cropped successfully!');
    } else {
      setImages(prev => [...prev, croppedFile]);
      setImagePreviews(prev => [...prev, URL.createObjectURL(croppedFile)]);
    }
    setCroppingFile(null);
    setCroppingIndex(null);
  };

  const processFiles = async (files: File[]) => {
    const validFiles: File[] = [];
    for (const file of files) {
      if (file.type.startsWith('video/')) {
        const isValid = await validateVideoDuration(file);
        if (!isValid) {
          toast.info(`Video "${file.name}" exceeds 60s limit. Opening trimmer...`);
          setTrimmingFile(file);
          setTrimmingIndex(null);
          setIsTrimmerOpen(true);
          continue;
        }
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setImages(prev => [...prev, ...validFiles]);
      setImagePreviews(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
    }
  };
  
  const { data: fieldsData } = useSWR(`${BASE_URL}/api/fields`, fetcher, { revalidateOnFocus: false });
  const fields: any[] = fieldsData?.fields || fieldsData || [];

  const filteredFields = fields.filter(f => f.name.toLowerCase().includes(fieldSearch.toLowerCase()));
  const schema = mode === 'post' ? postSchema : articleSchema;

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: { body: '', field: '', title: '' },
  });

  const bodyValue = watch('body') || '';

  const onSubmit = async (values: Record<string, string>) => {
    if (!accessToken) return;
    setSubmitting(true);

    // NEW: Enforce that posts have either text body or attached media files
    if (mode === 'post' && !values.body?.trim() && images.length === 0) {
      toast.error('Post must contain either text or media (image/video)');
      setSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('contentType', mode);
      formData.append('body', values.body || '');
      formData.append('isSensitive', isSensitive.toString());
      
      if (mode === 'article') {
        if (values.field) formData.append('field', values.field);
        formData.append('title', values.title);
      }
      
      images.forEach(img => formData.append('media', img));

      const res = await fetch(`${BASE_URL}/api/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create post');
      }

      router.push('/home');
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto pt-4 space-y-4">
      <div className="flex gap-1 bg-muted p-1 rounded-xl">
        {(['post', 'article'] as ContentMode[]).map((m) => (
          <button
          key={m}
          onClick={() => { setMode(m); reset(); setImages([]); setImagePreviews([]); setFieldSearch(''); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-semibold rounded-lg ${
            mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
          }`}
          >
            {m === 'post' ? <MessageSquare className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            {m === 'article' ? 'Article/Story' : 'Post'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-border rounded-2xl p-4 space-y-4">
        {mode === 'article' && (
          <>
            <Input id="title" placeholder="title..." className="border-none text-lg font-semibold px-0" {...register('title')} />
            
            <div className="relative">
              <Input
                placeholder="Search field..."
                value={fieldSearch}
                onChange={(e) => {
                  setFieldSearch(e.target.value);
                  setShowFieldDropdown(true);
                }}
                onFocus={() => setShowFieldDropdown(true)}
                className="w-full"
              />
              {showFieldDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-md max-h-48 overflow-y-auto">
                  {filteredFields.length > 0 ? (
                    filteredFields.map((f: any) => (
                      <button
                        key={f._id}
                        type="button"
                        onClick={() => {
                          setValue('field', f._id);
                          setFieldSearch(f.name);
                          setShowFieldDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      >
                        {f.name}
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-2 text-sm text-muted-foreground">No fields found</div>
                  )}
                </div>
              )}
            </div>
            <input type="hidden" {...register('field')} />
            {errors.field && <p className="text-xs text-destructive">{errors.field.message as string}</p>}
          </>
        )}

        {mode === 'post' ? (
          <textarea
            {...register('body')}
            rows={4}
            placeholder="What's happening?"
            className="w-full bg-transparent border-none text-sm resize-none focus:outline-none placeholder:text-muted-foreground"
          />
        ) : (
          <ContentEditor
            value={bodyValue}
            onChange={(html) => setValue('body', html, { shouldValidate: true })}
            placeholder="Tell your story..."
            minHeight="250px"
          />
        )}
        
        <MediaUploader 
          files={images}
          previews={imagePreviews}
          onUpload={processFiles}
          onRemove={(index) => {
            setImages(prev => prev.filter((_, i) => i !== index));
            setImagePreviews(prev => {
              URL.revokeObjectURL(prev[index]);
              return prev.filter((_, i) => i !== index);
            });
          }}
          onTrim={(index) => {
            const file = images[index];
            if (file && file.type.startsWith('video/')) {
              setTrimmingFile(file);
              setTrimmingIndex(index);
              setIsTrimmerOpen(true);
            }
          }}
          onCrop={(index) => {
            const file = images[index];
            if (file && file.type.startsWith('image/')) {
              setCroppingFile(file);
              setCroppingIndex(index);
              setIsCropperOpen(true);
            }
          }}
        />

        <div className="flex items-center gap-2 px-1">
          <input 
            type="checkbox" 
            id="isSensitive" 
            checked={isSensitive} 
            onChange={(e) => setIsSensitive(e.target.checked)}
            className="w-4 h-4 accent-accent rounded"
          />
          <Label htmlFor="isSensitive" className="text-xs text-muted-foreground cursor-pointer select-none">Mark as Sensitive Content (18+)</Label>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex gap-2 text-muted-foreground">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="hover:text-accent"><ImageIcon className="w-5 h-5" /></button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="hover:text-accent"><Video className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center gap-3">
           <div className="flex flex-col items-end">
                <span className={`text-xs ${stripHtml(bodyValue).length > (mode === 'post' ? 200 : 10000) ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {stripHtml(bodyValue).length}/{mode === 'post' ? '200' : '10000'}
                </span>
                {stripHtml(bodyValue).length > (mode === 'post' ? 200 : 10000) && (
                  <span className="text-[10px] text-destructive">
                    {mode === 'post' ? 'Post limit exceeded' : 'Article limit exceeded'}
                  </span>
                )}
              </div>
             <Button type="submit" loading={submitting}>Publish</Button>
          </div>
        </div>
        
        {/* Hidden File Input for the icons to trigger */}
        <input 
          ref={fileInputRef} 
          type="file" 
          accept="image/*,video/*" 
          multiple 
          className="hidden" 
          onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) {
              await processFiles(files);
            }
            e.target.value = '';
          }} 
        />
      </form>

      {trimmingFile && (
        <VideoTrimmerModal
          file={trimmingFile}
          isOpen={isTrimmerOpen}
          onClose={() => {
            setIsTrimmerOpen(false);
            setTrimmingFile(null);
            setTrimmingIndex(null);
          }}
          onTrimComplete={handleTrimComplete}
        />
      )}

      {croppingFile && (
        <ImageCropperModal
          file={croppingFile}
          isOpen={isCropperOpen}
          onClose={() => {
            setIsCropperOpen(false);
            setCroppingFile(null);
            setCroppingIndex(null);
          }}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
