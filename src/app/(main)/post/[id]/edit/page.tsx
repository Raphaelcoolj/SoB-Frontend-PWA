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
import { toast } from 'sonner';
import { fetchWithAuth } from '../../../../../lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const fetcher = (url: string) => fetchWithAuth(url).then(r => r.json()).then(d => d.data);

const postSchema = z.object({
  body: z.string().min(1, 'Content is required').max(200, 'Posts cannot exceed 200 characters'),
});

const articleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  body: z.string().min(1, 'Content is required').max(5000, 'Articles cannot exceed 5000 characters'),
  field: z.string().min(1, 'Field is required'),
});

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    try {
      const formData = new FormData();
      formData.append('body', values.body);
      
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
          <h1 className="font-bold text-lg">Edit {mode === 'post' ? 'Post' : 'Article'}</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {mode === 'article' && (
            <>
              <Input id="title" placeholder="Article title..." className="border-none text-lg font-semibold px-0" {...register('title')} />
              
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

          <textarea
            {...register('body')}
            rows={mode === 'post' ? 4 : 8}
            placeholder={mode === 'post' ? "What's happening?" : 'Tell your story...'}
            className="w-full bg-transparent border-none text-sm resize-none focus:outline-none placeholder:text-muted-foreground"
          />

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
          />

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex gap-2 text-muted-foreground">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="hover:text-accent"><ImageIcon className="w-5 h-5" /></button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="hover:text-accent"><Video className="w-5 h-5" /></button>
            </div>
            <div className="flex items-center gap-3">
               <div className="flex flex-col items-end">
                 <span className={`text-xs ${bodyValue.length > (mode === 'post' ? 200 : 5000) ? 'text-destructive' : 'text-muted-foreground'}`}>
                   {bodyValue.length}/{mode === 'post' ? '200' : '5000'}
                 </span>
               </div>
               <Button type="submit" loading={submitting}>Save Changes</Button>
            </div>
          </div>
          
          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setImages(prev => [...prev, ...files]);
              setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
              e.target.value = '';
          }} />
        </form>
      </div>
    </div>
  );
}
