'use client';

/**
 * @file page.tsx (create)
 * @description Unified content creation page.
 */

import React, { useState, useRef } from 'react';
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
import { toast } from 'sonner';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const fetcher = (url: string) => fetch(url).then(r => r.json()).then(d => d.data);

type ContentMode = 'post' | 'article';

const postSchema = z.object({
  body: z.string().min(1, 'Content is required').max(200, 'Posts cannot exceed 200 characters'),
});

const articleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  body: z.string().min(1, 'Content is required').max(5000, 'Articles cannot exceed 5000 characters'),
  field: z.string().min(1, 'Field is required'),
});

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

    try {
      const formData = new FormData();
      formData.append('contentType', mode);
      formData.append('body', values.body);
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
            {m === 'article' ? 'Story' : 'Post'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-card border border-border rounded-2xl p-4 space-y-4">
        {mode === 'article' && (
          <>
            <Input id="title" placeholder="Story title..." className="border-none text-lg font-semibold px-0" {...register('title')} />
            
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
               <span className={`text-xs ${bodyValue.length > (mode === 'post' ? 200 : 5000) ? 'text-destructive' : 'text-muted-foreground'}`}>
                 {bodyValue.length}/{mode === 'post' ? '200' : '5000'}
               </span>
               {bodyValue.length > (mode === 'post' ? 200 : 5000) && (
                 <span className="text-[10px] text-destructive">
                   {mode === 'post' ? 'Post limit exceeded' : 'Continue thread in comments'}
                 </span>
               )}
             </div>
             <Button type="submit" loading={submitting}>Publish</Button>
          </div>
        </div>
        
        {/* Hidden File Input for the icons to trigger */}
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => {
            const files = Array.from(e.target.files || []);
            setImages(prev => [...prev, ...files]);
            setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
            e.target.value = '';
        }} />
      </form>
    </div>
  );
}
