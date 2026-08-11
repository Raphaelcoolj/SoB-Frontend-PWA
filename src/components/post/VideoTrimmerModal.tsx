'use client';

/**
 * @file VideoTrimmerModal.tsx
 * @description SoB video editor (PWA) — full-screen trim modal.
 *
 * UI: a native-style timeline with a **filmstrip** of frame thumbnails sampled
 * across the full clip (canvas draws from a hidden video), a **two-handle**
 * selection over the filmstrip that enforces the 60s Mux limit (see
 * `src/lib/videoTrim.ts` for the pure math), a play/pause preview restricted
 * to the selected range, and a live time readout (current / selected / total).
 *
 * Export: trims via `HTMLMediaElement.captureStream()` + `MediaRecorder` (no
 * canvas re-draw per frame); a low-framerate canvas fallback covers browsers
 * without captureStream. The modal replaces the selected media item with the
 * newly encoded `File`.
 *
 * Usage: `<VideoTrimmerModal file isOpen onClose onTrimComplete />`.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Play, Pause, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import {
  FILMSTRIP_FRAME_COUNT,
  filmstripTimes,
  formatTrimTime,
  initialTrim,
  isTrimValid,
  moveHandle,
  pctForTime,
  clamp,
  type TrimRange,
} from '../../lib/videoTrim';

interface VideoTrimmerModalProps {
  file: File;
  isOpen: boolean;
  onClose: () => void;
  onTrimComplete: (trimmedFile: File) => void;
}

type CaptureStreamVideo = HTMLVideoElement & {
  captureStream?: (frameRate?: number) => MediaStream;
};

function tryCaptureStream(video: HTMLVideoElement): MediaStream | null {
  const v = video as CaptureStreamVideo;
  if (typeof v.captureStream !== 'function') return null;
  try {
    return v.captureStream();
  } catch {
    return null;
  }
}

/**
 * Draws one filmstrip frame per `filmstripTimes(duration)` sample onto an
 * offscreen canvas, returning JPEG data URLs. Best-effort — resolves with
 * whatever frames were produced (possibly none) if the video can't be read.
 */
function renderFilmstrip(videoUrl: string, duration: number): Promise<string[]> {
  return new Promise((resolve) => {
    const strip = document.createElement('video');
    strip.src = videoUrl;
    strip.muted = true;
    strip.preload = 'auto';
    strip.playsInline = true;
    strip.style.display = 'none';
    document.body.appendChild(strip);

    const times = filmstripTimes(duration, FILMSTRIP_FRAME_COUNT);
    const W = 96;
    const H = Math.max(1, Math.round((W * 9) / 16));
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    const frames: string[] = [];

    let i = 0;
    let finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      strip.removeAttribute('src');
      document.body.removeChild(strip);
      resolve(frames);
    };

    strip.addEventListener('loadedmetadata', () => {
      const onSeeked = () => {
        if (finished) return;
        try {
          if (ctx) {
            ctx.drawImage(strip, 0, 0, W, H);
            frames.push(canvas.toDataURL('image/jpeg', 0.7));
          }
        } catch {
          /* skip a frame we couldn't decode */
        }
        i += 1;
        step();
      };
      strip.addEventListener('seeked', onSeeked);

      const step = () => {
        if (finished) return;
        if (i >= times.length) {
          done();
          return;
        }
        try {
          strip.currentTime = times[i];
        } catch {
          done();
        }
      };
      step();
    });

    strip.addEventListener('error', done, { once: true });
  });
}

export default function VideoTrimmerModal({
  file,
  isOpen,
  onClose,
  onTrimComplete,
}: VideoTrimmerModalProps) {
  const [videoDuration, setVideoDuration] = useState(0);
  const [trim, setTrim] = useState<TrimRange>({ start: 0, end: 0 });
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0);
  const [frames, setFrames] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  // Keep the object URL alive for both the preview and the export pipeline,
  // which creates its OWN hidden <video> using the same URL. One URL per file;
  // the previous URL is revoked only after a new one exists (see cleanup).
  const urlRef = useRef<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');

  useEffect(() => {
    const next = URL.createObjectURL(file);
    urlRef.current = next;
    // Deferred (not synchronous) so the react-hooks/set-state-in-effect rule
    // stays satisfied — same pattern as the other PWA effects.
    const t = window.setTimeout(() => setVideoUrl(next), 0);
    return () => {
      window.clearTimeout(t);
      URL.revokeObjectURL(next);
      setVideoUrl('');
    };
  }, [file]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      if (!duration || !Number.isFinite(duration) || duration <= 0) return;
      setVideoDuration(duration);
      setTrim(initialTrim(duration));
    }
  };

  // Build the filmstrip once the duration is known. Frames are applied in the
  // async callback (not synchronously in the effect body).
  useEffect(() => {
    if (!videoUrl || videoDuration <= 0) return;
    let cancelled = false;
    renderFilmstrip(videoUrl, videoDuration).then((result) => {
      if (!cancelled) setFrames(result);
    });
    return () => {
      cancelled = true;
    };
  }, [videoUrl, videoDuration]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    if (v.currentTime >= trim.end) {
      v.currentTime = trim.start;
      if (!isPlaying) {
        v.pause();
      }
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
      return;
    }
    v.currentTime = trim.start;
    setCurrentTime(trim.start);
    void v.play();
    setIsPlaying(true);
  };

  /** Handle drag over the filmstrip timeline. */
  const handleHandleMove = (which: 'start' | 'end', pct: number) => {
    const next = moveHandle(which, pct, trim, videoDuration);
    setTrim(next);
    if (videoRef.current) {
      videoRef.current.currentTime = which === 'start' ? next.start : next.end;
      setCurrentTime(which === 'start' ? next.start : next.end);
    }
  };

  /* ---------- trim export (captureStream → MediaRecorder) ---------- */

  const startTrimming = () => {
    setIsTrimming(true);
    setTrimProgress(0);

    const video = document.createElement('video');
    video.src = videoUrl;
    video.playsInline = true;
    video.style.display = 'none';
    video.muted = false;
    document.body.appendChild(video);

    const totalDuration = trim.end - trim.start;

    let cleanupDone = false;
    const cleanup = () => {
      if (cleanupDone) return;
      cleanupDone = true;
      try {
        video.pause();
      } catch {
        /* ignore */
      }
      try {
        document.body.removeChild(video);
      } catch {
        /* ignore */
      }
    };

    const fail = (message: string) => {
      cleanup();
      setIsTrimming(false);
      toast.error(message);
    };

    const pickMime = () => {
      const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
        'video/mp4',
      ];
      for (const m of candidates) {
        if (MediaRecorder.isTypeSupported(m)) return m;
      }
      return '';
    };

    const finishRecording = (recorder: MediaRecorder, chunks: Blob[]) => {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'video/webm' });
      const trimmedFile = new File(
        [blob],
        `trimmed_${file.name.split('.')[0] || 'video'}.webm`,
        { type: 'video/webm' }
      );
      setIsTrimming(false);
      onTrimComplete(trimmedFile);
    };

    // Fallback: canvas capture at a low framerate + capped resolution (rare path).
    const captureViaCanvas = (v: HTMLVideoElement) => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, 960 / (v.videoWidth || 960));
      canvas.width = Math.round((v.videoWidth || 640) * scale);
      canvas.height = Math.round((v.videoHeight || 360) * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        fail('Trimming failed: canvas context error');
        return;
      }
      const stream = canvas.captureStream(15);
      const recorder = new MediaRecorder(stream, { mimeType: pickMime(), videoBitsPerSecond: 2_500_000 });
      const chunks: Blob[] = [];
      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) chunks.push(evt.data);
      };
      recorder.onstop = () => {
        cleanup();
        finishRecording(recorder, chunks);
      };
      let frameId = 0;
      const draw = () => {
        const pct = Math.min(((v.currentTime - trim.start) / totalDuration) * 100, 100);
        setTrimProgress(Math.floor(pct));
        if (v.currentTime >= trim.end || v.ended) {
          recorder.stop();
          return;
        }
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        frameId = requestAnimationFrame(draw);
      };
      recorder.start();
      v.play()
        .then(draw)
        .catch(() => {
          cancelAnimationFrame(frameId);
          recorder.stop();
          cleanup();
          setIsTrimming(false);
          toast.error('Playback failed while trimming the video.');
        });
    };

    video.onloadedmetadata = () => {
      try {
        video.currentTime = trim.start;
      } catch {
        fail('Failed to seek video.');
        return;
      }
      video.onseeked = () => {
        const stream = tryCaptureStream(video);
        if (!stream || stream.getVideoTracks().length === 0) {
          captureViaCanvas(video);
          return;
        }

        const combined = new MediaStream();
        combined.addTrack(stream.getVideoTracks()[0]);
        if (stream.getAudioTracks().length > 0) {
          combined.addTrack(stream.getAudioTracks()[0]);
        }

        const recorder = new MediaRecorder(combined, {
          mimeType: pickMime(),
          videoBitsPerSecond: 5_000_000,
        });
        const chunks: Blob[] = [];
        recorder.ondataavailable = (evt) => {
          if (evt.data && evt.data.size > 0) chunks.push(evt.data);
        };
        recorder.onstop = () => {
          cleanup();
          finishRecording(recorder, chunks);
        };
        recorder.onerror = () => {
          cleanup();
          setIsTrimming(false);
          toast.error('Recording failed while trimming the video.');
        };

        const interval = window.setInterval(() => {
          const pct = Math.min(((video.currentTime - trim.start) / totalDuration) * 100, 100);
          setTrimProgress(Math.floor(pct));
          if (video.currentTime >= trim.end || video.ended) {
            window.clearInterval(interval);
            recorder.stop();
          }
        }, 200);

        recorder.start();
        video.play().catch(() => {
          window.clearInterval(interval);
          recorder.stop();
          cleanup();
          setIsTrimming(false);
          toast.error('Playback failed while trimming the video.');
        });
      };
    };

    video.onerror = () => {
      fail('Failed to load video file for trimming.');
    };
  };

  if (!isOpen) return null;

  const trimLength = trim.end - trim.start;
  const valid = isTrimValid(trim);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between px-3 text-white">
        <button
          onClick={onClose}
          disabled={isTrimming}
          className="rounded-xl px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 disabled:opacity-40"
        >
          Cancel
        </button>
        <h3 className="flex items-center gap-2 text-base font-bold">
          <Pause className="hidden" />
          Trim Video
        </h3>
        <button
          onClick={onClose}
          disabled={isTrimming}
          aria-label="Close"
          className="rounded-full p-2 text-white/80 hover:bg-white/10 disabled:opacity-40"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      {/* Preview */}
      <div className="relative mx-3 min-h-0 flex-1 overflow-hidden rounded-xl bg-black/60">
        <video
          ref={videoRef}
          src={videoUrl}
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => setIsPlaying(false)}
          className="h-full w-full object-contain"
          playsInline
        />
        {!isTrimming && (
          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/60 p-4 text-white hover:bg-black/80"
          >
            {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
          </button>
        )}
      </div>

      {/* Time readout */}
      <div className="flex items-center justify-between px-4 pt-3 text-xs font-semibold tabular-nums text-white/80">
        <span>{formatTrimTime(currentTime)}</span>
        <span className="text-white">
          Selected {formatTrimTime(trim.start)} – {formatTrimTime(trim.end)} · {formatTrimTime(trimLength)}
        </span>
        <span>{formatTrimTime(videoDuration)}</span>
      </div>

      {/* Filmstrip timeline with two-handle trim */}
      {videoDuration > 0 && !isTrimming && (
        <div className="px-4 pt-3">
          <FilmstripTimeline
            frames={frames}
            duration={videoDuration}
            trim={trim}
            currentTime={currentTime}
            onChange={handleHandleMove}
          />

          {trimLength > 60 && (
            <p className="pt-2 text-center text-xs font-semibold text-red-400">
              Please reduce your selection to 60 seconds or less.
            </p>
          )}

          <div className="flex gap-3 pt-4">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" disabled={!valid} onClick={startTrimming}>
              Trim & Save
            </Button>
          </div>
        </div>
      )}

      {/* Processing State */}
      {isTrimming && (
        <div className="flex flex-col items-center space-y-4 py-10 text-white">
          <RefreshCw className="h-10 w-10 animate-spin text-white" />
          <div className="text-center">
            <p className="font-semibold">Processing Video clip...</p>
            <p className="mt-1 text-xs text-white/70">Please wait while we trim the file.</p>
          </div>
          <div className="h-2 w-full max-w-[200px] overflow-hidden rounded-full border border-white/20 bg-white/10">
            <div
              className="h-full rounded-full bg-white transition-all duration-300"
              style={{ width: `${trimProgress}%` }}
            />
          </div>
          <span className="text-xs font-bold">{trimProgress}%</span>
        </div>
      )}

      {/* Safe-area bottom padding for the nav area on mobile */}
      <div style={{ height: 'max(env(safe-area-inset-bottom, 0px), 12px)' }} />
    </div>
  );
}

/**
 * The filmstrip timeline: a row of thumbnail frames with a two-handle selection
 * overlay on top. Pointer events resolve a client X to a normalized [0..1]
 * position on the track; the parent maps that to a time via `moveHandle`.
 */
function FilmstripTimeline({
  frames,
  duration,
  trim,
  currentTime,
  onChange,
}: {
  frames: string[];
  duration: number;
  trim: TrimRange;
  currentTime: number;
  onChange: (which: 'start' | 'end', pct: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<'start' | 'end' | null>(null);

  const pctFor = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    return clamp((clientX - rect.left) / rect.width, 0, 1);
  }, []);

  const startPct = pctForTime(trim.start, duration);
  const endPct = pctForTime(trim.end, duration);
  const currentPct = pctForTime(currentTime, duration);

  return (
    <div
      ref={trackRef}
      className="relative h-20 w-full cursor-pointer touch-none select-none overflow-hidden rounded-lg"
      onPointerDown={(e) => {
        e.preventDefault();
        const el = trackRef.current;
        if (!el) return;
        el.setPointerCapture(e.pointerId);
        const pct = pctFor(e.clientX);
        const which = Math.abs(pct - startPct) <= Math.abs(pct - endPct) ? 'start' : 'end';
        setDrag(which);
        onChange(which, pct);
      }}
      onPointerMove={(e) => {
        if (drag) onChange(drag, pctFor(e.clientX));
      }}
      onPointerUp={() => setDrag(null)}
      onPointerCancel={() => setDrag(null)}
    >
      {/* Filmstrip frames */}
      <div className="absolute inset-0 flex">
        {frames.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center bg-white/10 text-xs text-white/60">
            Generating preview…
          </div>
        ) : (
          frames.map((src, i) => (
            <img
              key={i}
              src={src}
              alt=""
              className="h-full min-w-0 flex-1 object-cover"
              draggable={false}
            />
          ))
        )}
      </div>

      {/* Selection band */}
      <div
        className="pointer-events-none absolute inset-y-0 bg-white/25"
        style={{ left: `${startPct * 100}%`, width: `${(endPct - startPct) * 100}%` }}
      />

      {/* Start / end handles */}
      <div
        className="pointer-events-none absolute inset-y-0 w-3 -translate-x-1/2 rounded-sm bg-white"
        style={{ left: `${startPct * 100}%` }}
      >
        <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-black" />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0 w-3 -translate-x-1/2 rounded-sm bg-white"
        style={{ left: `${endPct * 100}%` }}
      >
        <div className="absolute left-1/2 top-1/2 h-4 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-black" />
      </div>

      {/* Playback scrubber */}
      <div
        className="pointer-events-none absolute inset-y-0 w-0.5 bg-yellow-300"
        style={{ left: `${currentPct * 100}%` }}
      />
    </div>
  );
}
