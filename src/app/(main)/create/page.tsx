'use client';

/**
 * @file page.tsx (create)
 * @description Unified content creation page. Media is constrained to a single
 * type per post (images OR a single video) via the shared lib/media model.
 */

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FileText, MessageSquare, Image as ImageIcon, Video, BarChart3 } from 'lucide-react';
import useSWR, { useSWRConfig } from 'swr';
import { useAuthStore } from '../../../store/authStore';
import type { Field } from '../../../types/user';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Label } from '../../../components/ui/Label';
import MediaUploader from '../../../components/post/MediaUploader';
import VideoTrimmerModal from '../../../components/post/VideoTrimmerModal';
import ImageCropperModal from '../../../components/post/ImageCropperModal';
import ContentEditor from '../../../components/post/ContentEditor';
import MentionTextarea from '../../../components/shared/MentionTextarea';
import PollComposer, { DraftPoll } from '../../../components/post/PollComposer';
import { SoBImageEditor } from '../../../components/editor/SoBImageEditor';
import { inspectImageFile, releaseSource } from '../../../lib/editor/load';
import type { EditorResult, EditorSource } from '../../../lib/editor/types';
import { toast } from 'sonner';
import { stripHtml } from '../../../lib/utils';
import {
  MediaItem,
  makeNewMediaItem,
  releaseMediaItem,
  mergeMediaWithConstraint,
  purgeRemoved,
} from '../../../lib/media';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const fetcher = (url: string) => fetch(url).then(r => r.json()).then(d => d.data);

type ContentMode = 'post' | 'article';

const postSchema = z.object({
  body: z.string().max(400, 'Posts cannot exceed 400 characters').optional().or(z.literal('')),
  field: z.string().optional(),
});

const articleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  body: z.string().min(1, 'Content is required').refine(
    (val) => stripHtml(val).length <= 10000,
    'Articles cannot exceed 10000 characters'
  ),
  field: z.string().optional(),
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
  const { accessToken, user } = useAuthStore();
  const { mutate } = useSWRConfig();
  const [mode, setMode] = useState<ContentMode>('post');
  const [media, setMedia] = useState<MediaItem[]>([]);
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
  const [poll, setPoll] = useState<DraftPoll | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingSource, setEditingSource] = useState<EditorSource | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addMediaItems = useCallback((files: File[]) => {
    if (files.length === 0) return;
    const incoming = files.map(makeNewMediaItem);
    setMedia(prev => {
      const { merged, replaced } = mergeMediaWithConstraint(prev, incoming);
      replaced.forEach(releaseMediaItem);
      return purgeRemoved(merged);
    });
  }, []);

  const clearMedia = useCallback(() => {
    setMedia(prev => {
      prev.forEach(releaseMediaItem);
      return [];
    });
  }, []);

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

  const handleEditStart = useCallback(async (index: number) => {
    const item = media[index];
    if (!item || item.isVideo || item.kind !== 'new' || !item.file) return;
    try {
      const src = await inspectImageFile(item.file);
      setEditingIndex(index);
      setEditingSource(src);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open the image editor.');
    }
  }, [media]);

  const handleEditDone = useCallback((result: EditorResult) => {
    if (editingIndex === null) return;
    setMedia(prev => {
      const next = [...prev];
      const old = next[editingIndex];
      const replacement = makeNewMediaItem(result.file);
      if (old && old.kind === 'new') releaseMediaItem(old);
      next[editingIndex] = replacement;
      return next;
    });
    toast.success('Image edited successfully!');
    if (editingSource) releaseSource(editingSource);
    setEditingSource(null);
    setEditingIndex(null);
  }, [editingIndex, editingSource]);

  const handleEditClose = useCallback(() => {
    if (editingSource) releaseSource(editingSource);
    setEditingSource(null);
    setEditingIndex(null);
  }, [editingSource]);

  const processFiles = async (files: File[]) => {
    const validFiles: File[] = [];
    let trimmerOpened = false;
    for (const file of files) {
      if (file.type.startsWith('video/')) {
        const isValid = await validateVideoDuration(file);
        if (!isValid) {
          toast.info(`Video "${file.name}" exceeds 60s limit. Opening trimmer...`);
          if (!trimmerOpened) {
            setTrimmingFile(file);
            setTrimmingIndex(null);
            setIsTrimmerOpen(true);
            trimmerOpened = true;
          }
          continue;
        }
        validFiles.push(file);
      } else if (file.type.startsWith('image/')) {
        // Images are added directly. The user can optionally crop/edit via the
        // per-item Edit and Crop buttons in the MediaUploader — do NOT force
        // every image through the cropper automatically.
        validFiles.push(file);
      } else {
        toast.error(`Unsupported file type: ${file.name || 'unknown'}`);
      }
    }

    if (validFiles.length > 0) addMediaItems(validFiles);
  };

  const { data: fieldsData } = useSWR(`${BASE_URL}/api/fields`, fetcher, { revalidateOnFocus: false });
  const fields: Field[] = fieldsData?.fields || fieldsData || [];

  const filteredFields = fields.filter(f => f.name.toLowerCase().includes(fieldSearch.toLowerCase()));
  const schema = mode === 'post' ? postSchema : articleSchema;

  interface CreateFormValues {
    body: string;
    title: string;
    field: string;
  }

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<CreateFormValues>({
    resolver: zodResolver(schema) as unknown as Resolver<CreateFormValues>,
    defaultValues: { body: '', field: '', title: '' },
  });

  const bodyValue = watch('body') || '';
  const hasMedia = media.some(i => !i.removed);

  const onSubmit = async (values: CreateFormValues) => {
    if (!accessToken) return;
    setSubmitting(true);

    // NEW: Enforce that posts have either text body or attached media files
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
      formData.append('contentType', mode);
      formData.append('body', values.body || '');
      formData.append('isSensitive', isSensitive.toString());

      if (values.field) formData.append('field', values.field);
      if (mode === 'article') {
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

      media.filter(i => !i.removed && i.kind === 'new' && i.file)
        .forEach(item => formData.append('media', item.file as File));

      const res = await fetch(`${BASE_URL}/api/posts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to create post');
      }

      // Bust the profile posts SWR cache so the new post shows immediately
      // when the user lands on their profile page.
      if (user?.username) {
        const base = BASE_URL;
        // Invalidate all pages of the profile posts cache for both tabs so
        // whichever tab the user lands on fetches fresh data.
        await mutate(
          (key: unknown) =>
            Array.isArray(key) &&
            typeof key[0] === 'string' &&
            key[0].includes(`/api/posts/user/`),
          undefined,
          { revalidate: true }
        );
        // Also bust the profile stats (postsCount in header).
        await mutate(`${base}/api/users/${user.username}`);
      }

      // Redirect straight to the user's own profile on the correct tab so
      // they can immediately see the new post/article.
      const targetTab = mode === 'article' ? 'articles' : 'posts';
      if (user?.username) {
        router.push(`/profile/${user.username}?tab=${targetTab}`);
      } else {
        router.push('/home');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'An error occurred');
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
            onClick={() => { setMode(m); reset(); clearMedia(); setFieldSearch(''); setPoll(null); }}
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
          <Input id="title" placeholder="title..." className="border-none text-lg font-semibold px-0" {...register('title')} />
        )}

        <div className="relative">
          <Input
            placeholder={mode === 'article' ? 'Search field...' : 'Search field (optional)'}
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
            minHeight="300px"
          />
        )}

        {hasMedia && (
          <MediaUploader
            items={media}
            onRemove={(index) => {
              setMedia(prev => {
                const target = prev[index];
                const next = prev.filter((_, i) => i !== index);
                if (target && target.kind === 'new') releaseMediaItem(target);
                return next;
              });
            }}
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
            onEdit={handleEditStart}
          />
        )}

        {poll && (
          <PollComposer
            value={poll}
            onChange={setPoll}
            onRemove={() => setPoll(null)}
          />
        )}

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
          <div className="flex items-center gap-2 text-muted-foreground">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="hover:text-accent cursor-pointer" title="Add image(s)"><ImageIcon className="w-5 h-5" /></button>
            <button type="button" onClick={() => fileInputRef.current?.click()} className="hover:text-accent cursor-pointer" title="Add a video"><Video className="w-5 h-5" /></button>
            <button
              type="button"
              onClick={() => setPoll(poll ? null : { question: '', options: ['', ''], allowMultiple: false })}
              className={`hover:text-accent cursor-pointer ${poll ? 'text-accent' : ''}`}
              title="Add a poll"
            >
              <BarChart3 className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs ${stripHtml(bodyValue).length > (mode === 'post' ? 400 : 10000) ? 'text-destructive' : 'text-muted-foreground'}`}>
              {stripHtml(bodyValue).length}/{mode === 'post' ? '400' : '10000'}
            </span>
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

      {editingSource && (
        <SoBImageEditor
          source={editingSource}
          onClose={handleEditClose}
          onDone={handleEditDone}
        />
      )}
    </div>
  );
}
