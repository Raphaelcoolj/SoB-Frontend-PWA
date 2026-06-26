'use client';

/**
 * @file page.tsx (edit)
 * @description Page for editing existing posts and articles.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FileText, MessageSquare, Image as ImageIcon, Video, ArrowLeft, Loader2 } from 'lucide-react';
import useSWR from 'swr';
import { useAuthStore } from '../../../../../store/authStore';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import MediaUploader from '../../../../../components/post/MediaUploader';
import ImageCropperModal from '../../../../../components/post/ImageCropperModal';
import ContentEditor from '../../../../../components/post/ContentEditor';
import { toast } from 'sonner';
import { fetchWithAuth } from '../../../../../lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const fetcher = (url: string) => fetchWithAuth(url).then(r => r.json()).then(d => d.data);

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

export default function EditPostPage() {
  const router = useRouter();
  const { id } = useParams();
  const { user, accessToken } = useAuthStore();
  const [mode, setMode] = useState<'post' | 'article'>('post');
  const [images, setImages] = useState<File[]>([]);
  const [existingMedia, setExistingMedia] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const [croppingFile, setCroppingFile] = useState<File | null>(null);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    }
    setCroppingFile(null);
    setCroppingIndex(null);
  };

  const { data, isLoading: loadingPost } = useSWR(id ? `/api/posts/${id}` : null, fetcher);
  const { data: fieldsData } = useSWR(`${BASE_URL}/api/fields`, (url) => fetch(url).then(r => r.json()).then(d => d.data), { revalidateOnFocus: false });
  
  const post = data?.post;
  const fields: any[] = fieldsData?.fields || fieldsData || [];

  useEffect(() => {
    if (post && user && post.author._id !== user._id) {
      toast.error('You are not authorized to edit this post');
      router.push(`/post/${id}`);
    }
  }, [post, user, router, id]);

  const filteredFields = fields.filter(f => f.name.toLowerCase().includes(fieldSearch.toLowerCase()));

  const schema = mode === 'post' ? postSchema : articleSchema;
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<any>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (post) {
      setMode(post.contentType === 'article' ? 'article' : 'post');
      reset({
        body: post.body,
        title: post.title || '',
        field: post.field?._id || post.field || '',
      });
      if (post.field?.name) {
        setFieldSearch(post.field.name);
      }
      setExistingMedia(post.mediaUrls || []);
    }
  }, [post, reset]);

  const bodyValue = watch('body') || '';

  const onSubmit = async (values: Record<string, string>) => {
    if (!accessToken) return;
    setSubmitting(true);

    // NEW: Enforce that posts have either text body or attached media (existing or new)
    if (mode === 'post' && !values.body?.trim() && images.length === 0 && existingMedia.length === 0) {
      toast.error('Post must contain either text or media (image/video)');
      setSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('body', values.body || '');
      
      if (mode === 'article') {
        if (values.field) formData.append('field', values.field);
        formData.append('title', values.title);
      }
      
      images.forEach(img => formData.append('media', img));

      const res = await fetch(`${BASE_URL}/api/posts/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to update post');
      }

      toast.success('Post updated successfully');
      router.push(`/post/${id}`);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingPost) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-20 text-muted-foreground">Post not found</div>
    );
  }

  return (
    <div className="max-w-xl mx-auto pt-4 space-y-4">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border">
          {mode === 'post' ? <MessageSquare className="w-5 h-5 text-accent" /> : <FileText className="w-5 h-5 text-accent" />}
          <h1 className="font-bold text-lg">Edit {mode === 'post' ? 'Post' : 'Article/Story'}</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          {existingMedia.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {existingMedia.map((url, i) => (
                <div key={i} className="relative group">
                  <img src={url} alt="" className="w-full h-32 object-cover rounded-lg border border-border opacity-50" />
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white bg-black/20 rounded-lg">
                    EXISTING MEDIA
                  </div>
                </div>
              ))}
            </div>
          )}
          
          <MediaUploader 
            files={images}
            previews={imagePreviews}
            onUpload={(newFiles) => {
              setImages(prev => [...prev, ...newFiles]);
              setImagePreviews(prev => [...prev, ...newFiles.map(f => URL.createObjectURL(f))]);
            }}
            onRemove={(index) => {
              setImages(prev => prev.filter((_, i) => i !== index));
              setImagePreviews(prev => prev.filter((_, i) => i !== index));
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
                </div>
               <Button type="submit" loading={submitting}>Save Changes</Button>
            </div>
          </div>
          
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              const validFiles: File[] = [];
              
              for (const file of files) {
                if (file.type.startsWith('video/')) {
                  const isValid = await validateVideoDuration(file);
                  if (!isValid) {
                    toast.error(`Video "${file.name}" exceeds the 60-second limit.`);
                    continue;
                  }
                }
                validFiles.push(file);
              }

              if (validFiles.length > 0) {
                setImages(prev => [...prev, ...validFiles]);
                setImagePreviews(prev => [...prev, ...validFiles.map(f => URL.createObjectURL(f))]);
              }
              e.target.value = '';
          }} />
        </form>
      </div>

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
