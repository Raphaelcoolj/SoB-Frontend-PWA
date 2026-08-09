'use client';

/**
 * @file page.tsx (edit)
 * @description Page for editing existing posts and articles. Existing media is
 * preserved and individually removable (with undo); new media enforces the same
 * single-media-type rule as the create composer via the shared lib/media model.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FileText, MessageSquare, Image as ImageIcon, Video, ArrowLeft, Loader2, BarChart3 } from 'lucide-react';
import useSWR from 'swr';
import { useAuthStore } from '../../../../../store/authStore';
import type { Field } from '../../../../../types/user';
import { Button } from '../../../../../components/ui/Button';
import { Input } from '../../../../../components/ui/Input';
import MediaUploader from '../../../../../components/post/MediaUploader';
import VideoTrimmerModal from '../../../../../components/post/VideoTrimmerModal';
import ImageCropperModal from '../../../../../components/post/ImageCropperModal';
import ContentEditor from '../../../../../components/post/ContentEditor';
import MentionTextarea from '../../../../../components/shared/MentionTextarea';
import PollComposer, { DraftPoll } from '../../../../../components/post/PollComposer';
import { toast } from 'sonner';
import { fetchWithAuth } from '../../../../../lib/api';
import { stripHtml } from '../../../../../lib/utils';
import {
  MediaItem,
  makeNewMediaItem,
  makeExistingMediaItem,
  releaseMediaItem,
  mergeMediaWithConstraint,
} from '../../../../../lib/media';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const fetcher = (url: string) => fetchWithAuth(url).then(r => r.json()).then(d => d.data);

const postSchema = z.object({
  // NEW: Make post body optional to allow media-only posts
  body: z.string().max(400, 'Posts cannot exceed 400 characters').optional().or(z.literal('')),
});

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
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');
  const [showFieldDropdown, setShowFieldDropdown] = useState(false);
  const [trimmingFile, setTrimmingFile] = useState<File | null>(null);
  const [trimmingIndex, setTrimmingIndex] = useState<number | null>(null);
  const [isTrimmerOpen, setIsTrimmerOpen] = useState(false);
  const [croppingFile, setCroppingFile] = useState<File | null>(null);
  const [croppingIndex, setCroppingIndex] = useState<number | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [poll, setPoll] = useState<DraftPoll | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addMediaItems = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const incoming = files.map(makeNewMediaItem);
    setMedia(prev => mergeMediaWithConstraint(prev, incoming).merged);
  }, []);

  const handleRemoveMedia = (index: number) => {
    setMedia(prev => {
      const item = prev[index];
      if (item.kind === 'new') {
        releaseMediaItem(item);
        return prev.filter((_, i) => i !== index);
      }
      return prev.map((it, i) => (i === index ? { ...it, removed: true } : it));
    });
  };

  const handleRestoreMedia = (index: number) => {
    setMedia(prev => prev.map((it, i) => (i === index ? { ...it, removed: false } : it)));
  };

  const handleTrimComplete = (trimmedFile: File) => {
    setIsTrimmerOpen(false);
    if (trimmingIndex !== null) {
      setMedia(prev => {
        const next = [...prev];
        const old = next[trimmingIndex];
        const replacement = makeNewMediaItem(trimmedFile);
        if (old && old.kind === 'new') releaseMediaItem(old);
        next[trimmingIndex] = replacement;
        return next;
      });
      toast.success('Video trimmed successfully!');
    } else {
      addMediaItems([trimmedFile]);
      toast.success('Video trimmed and added!');
    }
    setTrimmingFile(null);
    setTrimmingIndex(null);
  };

  const handleCropComplete = (croppedFile: File) => {
    setIsCropperOpen(false);
    if (croppingIndex !== null) {
      setMedia(prev => {
        const next = [...prev];
        const old = next[croppingIndex];
        const replacement = makeNewMediaItem(croppedFile);
        if (old && old.kind === 'new') releaseMediaItem(old);
        next[croppingIndex] = replacement;
        return next;
      });
      toast.success('Image cropped successfully!');
    } else {
      addMediaItems([croppedFile]);
    }
    setCroppingFile(null);
    setCroppingIndex(null);
  };

  const processFiles = async (files: File[]) => {
    const validFiles: File[] = [];
    let modalOpened = false;
    for (const file of files) {
      if (file.type.startsWith('video/')) {
        const isValid = await validateVideoDuration(file);
        if (!isValid) {
          toast.info(`Video "${file.name}" exceeds 60s limit. Opening trimmer...`);
          if (!modalOpened) {
            setTrimmingFile(file);
            setTrimmingIndex(null);
            setIsTrimmerOpen(true);
            modalOpened = true;
          }
          continue;
        }
        validFiles.push(file);
      } else if (file.type.startsWith('image/')) {
        if (!modalOpened) {
          setCroppingFile(file);
          setCroppingIndex(null);
          setIsCropperOpen(true);
          modalOpened = true;
          continue;
        }
        validFiles.push(file);
      } else {
        toast.error(`Unsupported file type: ${file.name || 'unknown'}`);
      }
    }

    if (validFiles.length > 0) addMediaItems(validFiles);
  };

  const { data, isLoading: loadingPost } = useSWR(id ? `/api/posts/${id}` : null, fetcher);
  const { data: fieldsData } = useSWR(`${BASE_URL}/api/fields`, (url) => fetch(url).then(r => r.json()).then(d => d.data), { revalidateOnFocus: false });

  const post = data?.post;
  const fields: Field[] = fieldsData?.fields || fieldsData || [];

  useEffect(() => {
    if (post && user && post.author._id !== user._id && user.role !== 'admin') {
      toast.error('You are not authorized to edit this post');
      router.push(`/post/${id}`);
    }
  }, [post, user, router, id]);

  const filteredFields = fields.filter(f => f.name.toLowerCase().includes(fieldSearch.toLowerCase()));

  const schema = mode === 'post' ? postSchema : articleSchema;

  interface EditFormValues {
    body: string;
    title: string;
    field: string;
  }

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<EditFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<EditFormValues>,
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
      // NEW: Load existing media into the shared model (removable, restored on undo).
      setMedia((post.mediaUrls || []).map(makeExistingMediaItem));
      if (post.poll) {
        setPoll({
          question: post.poll.question || '',
          options: (post.poll.options || []).map((o: { text: string }) => o.text),
          allowMultiple: !!post.poll.allowMultiple,
        });
      } else {
        setPoll(null);
      }
    }
  }, [post, reset]);

  const bodyValue = watch('body') || '';
  const hasMedia = media.some(i => !i.removed);

  const onSubmit = async (values: EditFormValues) => {
    if (!accessToken) return;
    setSubmitting(true);

    // NEW: Enforce that posts have either text body or attached media (existing or new)
    if (mode === 'post' && !values.body?.trim() && media.filter(i => !i.removed).length === 0 && !poll) {
      toast.error('Post must contain either text, media (image/video), or a poll');
      setSubmitting(false);
      return;
    }

    if (poll) {
      const question = poll.question.trim();
      const options = poll.options.map((o) => o.trim()).filter(Boolean);
      if (!question) {
        toast.error('Poll question is required');
        setSubmitting(false);
        return;
      }
      if (options.length < 2) {
        toast.error('Poll must have at least 2 options');
        setSubmitting(false);
        return;
      }
    }

    try {
      const formData = new FormData();
      formData.append('body', values.body || '');

      if (mode === 'article') {
        if (values.field) formData.append('field', values.field);
        formData.append('title', values.title);
      }

      if (poll) {
        const pollPayload = {
          question: poll.question.trim(),
          options: poll.options.map((o) => o.trim()).filter(Boolean).slice(0, 5),
          allowMultiple: poll.allowMultiple,
        };
        formData.append('poll', JSON.stringify(pollPayload));
      }

      // NEW: New files are uploaded; removed existing media is deleted server-side.
      media.filter(i => !i.removed && i.kind === 'new' && i.file)
        .forEach(item => formData.append('media', item.file as File));
      const removeMedia = media
        .filter(i => i.kind === 'existing' && i.removed && i.url)
        .map(i => i.url as string);
      if (removeMedia.length > 0) {
        formData.append('removeMedia', JSON.stringify(removeMedia));
      }

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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
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
                      filteredFields.map((f) => (
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
            <MentionTextarea
              value={bodyValue}
              onChange={(val) => setValue('body', val, { shouldValidate: true })}
              rows={4}
              placeholder={hasMedia ? 'Add a caption...' : "What's happening?"}
              className="w-full bg-transparent border-none text-sm resize-none focus:outline-none placeholder:text-muted-foreground"
              maxLength={400}
            />
          ) : (
            <ContentEditor
              value={bodyValue}
              onChange={(html) => setValue('body', html, { shouldValidate: true })}
              placeholder="Tell your story..."
              minHeight="250px"
            />
          )}

          {media.length > 0 && (
            <MediaUploader
              items={media}
              onRemove={handleRemoveMedia}
              onRestore={handleRestoreMedia}
              onTrim={(index) => {
                const item = media[index];
                if (item && item.isVideo && item.kind === 'new' && item.file) {
                  setTrimmingFile(item.file);
                  setTrimmingIndex(index);
                  setIsTrimmerOpen(true);
                }
              }}
              onCrop={(index) => {
                const item = media[index];
                if (item && !item.isVideo && item.kind === 'new' && item.file) {
                  setCroppingFile(item.file);
                  setCroppingIndex(index);
                  setIsCropperOpen(true);
                }
              }}
            />
          )}

          {poll && (
            <PollComposer
              value={poll}
              onChange={setPoll}
              onRemove={() => setPoll(null)}
            />
          )}

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-2 text-muted-foreground">
              <button type="button" onClick={() => fileInputRef.current?.click()} className="hover:text-accent cursor-pointer" title="Add image(s)"><ImageIcon className="w-5 h-5" /></button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="hover:text-accent cursor-pointer" title="Add a video"><Video className="w-5 h-5" /></button>
              <button
                type="button"
                onClick={() => setPoll(poll ? null : { question: '', options: ['', ''], allowMultiple: false })}
                className={`hover:text-accent cursor-pointer ${poll ? 'text-accent' : ''}`}
                title="Add or edit poll"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs ${stripHtml(bodyValue).length > (mode === 'post' ? 400 : 10000) ? 'text-destructive' : 'text-muted-foreground'}`}>
                {stripHtml(bodyValue).length}/{mode === 'post' ? '400' : '10000'}
              </span>
              <Button type="submit" loading={submitting}>Save Changes</Button>
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length > 0) {
              await processFiles(files);
            }
            e.target.value = '';
          }} />
        </form>
      </div>

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
