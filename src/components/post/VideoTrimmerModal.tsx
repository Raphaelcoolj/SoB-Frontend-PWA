'use client';

// NEW: Video trimming modal component.
// Performance: trims via native HTMLMediaElement.captureStream() (no canvas +
// 30fps requestAnimationFrame re-draw); a low-framerate canvas fallback covers
// browsers without captureStream. Start/end selection uses a single two-handle
// range slider that enforces the 60-second max selection while dragging.
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Play, Pause, Scissors, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';

interface VideoTrimmerModalProps {
  file: File;
  isOpen: boolean;
  onClose: () => void;
  onTrimComplete: (trimmedFile: File) => void;
}

interface TrimRangeSliderProps {
  min: number;
  max: number;
  start: number;
  end: number;
  onChange: (start: number, end: number) => void;
}

const MAX_SELECTION_SECONDS = 60;

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

function TrimRangeSlider({ min, max, start, end, onChange }: TrimRangeSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<'start' | 'end' | null>(null);

  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  const valueToPct = (v: number) => ((v - min) / (max - min)) * 100;

  const applyFromX = useCallback(
    (which: 'start' | 'end', clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return;
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      const raw = min + ratio * (max - min);

      if (which === 'start') {
        const s = clamp(raw, min, max);
        let e = end;
        if (e - s > MAX_SELECTION_SECONDS) e = s + MAX_SELECTION_SECONDS;
        if (e <= s) e = Math.min(s + MAX_SELECTION_SECONDS, max);
        onChange(s, e);
      } else {
        const e = clamp(raw, min, max);
        let s = start;
        if (e - s > MAX_SELECTION_SECONDS) s = e - MAX_SELECTION_SECONDS;
        if (e <= s) s = Math.max(e - 0.1, min);
        onChange(s, e);
      }
    },
    [min, max, start, end, onChange]
  );

  const onTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = trackRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const raw = min + ratio * (max - min);
    const which = Math.abs(raw - start) <= Math.abs(raw - end) ? 'start' : 'end';
    setDrag(which);
    applyFromX(which, e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (drag) applyFromX(drag, e.clientX);
  };

  const onPointerUp = () => setDrag(null);

  const startPct = valueToPct(start);
  const endPct = valueToPct(end);

  return (
    <div
      ref={trackRef}
      className="relative h-8 flex items-center cursor-pointer touch-none select-none"
      onPointerDown={onTrackPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="absolute left-0 right-0 h-1.5 bg-muted rounded-full" />
      <div
        className="absolute h-1.5 bg-accent rounded-full"
        style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
      />
      <div
        className="absolute w-4 h-4 -ml-2 bg-white border-2 border-accent rounded-full shadow pointer-events-none"
        style={{ left: `${startPct}%` }}
      />
      <div
        className="absolute w-4 h-4 -ml-2 bg-white border-2 border-accent rounded-full shadow pointer-events-none"
        style={{ left: `${endPct}%` }}
      />
    </div>
  );
}

export default function VideoTrimmerModal({
  file,
  isOpen,
  onClose,
  onTrimComplete,
}: VideoTrimmerModalProps) {
  const [videoDuration, setVideoDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const [trimProgress, setTrimProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const timer = setTimeout(() => {
      setVideoUrl(url);
    }, 0);
    return () => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const duration = videoRef.current.duration;
      setVideoDuration(duration);
      setEndTime(Math.min(duration, MAX_SELECTION_SECONDS));
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      if (videoRef.current.currentTime >= endTime) {
        videoRef.current.currentTime = startTime;
        if (!isPlaying) {
          videoRef.current.pause();
        }
      }
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.currentTime = startTime;
        void videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const startTrimming = () => {
    setIsTrimming(true);
    setTrimProgress(0);

    const video = document.createElement('video');
    video.src = videoUrl;
    video.playsInline = true;
    video.style.display = 'none';
    video.muted = false;
    document.body.appendChild(video);

    const totalDuration = endTime - startTime;

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
        const pct = Math.min(((v.currentTime - startTime) / totalDuration) * 100, 100);
        setTrimProgress(Math.floor(pct));
        if (v.currentTime >= endTime || v.ended) {
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
        video.currentTime = startTime;
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
          const pct = Math.min(((video.currentTime - startTime) / totalDuration) * 100, 100);
          setTrimProgress(Math.floor(pct));
          if (video.currentTime >= endTime || video.ended) {
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

  const trimLength = endTime - startTime;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative bg-card border border-border w-full max-w-lg rounded-3xl shadow-2xl p-6 flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Scissors className="w-5 h-5 text-accent animate-pulse" />
            Trim Video Clip
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
            disabled={isTrimming}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Preview */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-border flex items-center justify-center">
          <video
            ref={videoRef}
            src={videoUrl}
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
            className="w-full h-full object-contain"
            playsInline
          />
          {!isTrimming && (
            <button
              onClick={togglePlay}
              className="absolute p-3 rounded-full bg-black/60 text-white hover:bg-black/80 transition-all hover:scale-105 active:scale-95"
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
          )}
        </div>

        {/* Range Controls */}
        {videoDuration > 0 && !isTrimming && (
          <div className="mt-6 space-y-4">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>Start: {startTime.toFixed(1)}s</span>
              <span className={trimLength > 60 ? 'text-destructive font-bold' : 'text-accent'}>
                Selected Duration: {trimLength.toFixed(1)}s (Max: 60s)
              </span>
              <span>End: {endTime.toFixed(1)}s</span>
            </div>

            {/* Two-handle range slider */}
            <TrimRangeSlider
              min={0}
              max={videoDuration}
              start={startTime}
              end={endTime}
              onChange={(s, e) => {
                setStartTime(s);
                setEndTime(e);
                if (videoRef.current) {
                  videoRef.current.currentTime = s;
                }
              }}
            />

            {trimLength > 60 && (
              <p className="text-xs text-red-500 text-center font-semibold">
                Please reduce your selection to 60 seconds or less.
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={trimLength > 60 || trimLength <= 0}
                onClick={startTrimming}
              >
                Trim & Save
              </Button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isTrimming && (
          <div className="mt-8 flex flex-col items-center justify-center space-y-4 py-4">
            <RefreshCw className="w-10 h-10 text-accent animate-spin" />
            <div className="text-center">
              <p className="font-semibold">Processing Video clip...</p>
              <p className="text-xs text-muted-foreground mt-1">Please wait while we trim the file.</p>
            </div>
            <div className="w-full max-w-[200px] bg-muted rounded-full h-2 overflow-hidden border border-border">
              <div
                className="bg-accent h-full transition-all duration-300 rounded-full"
                style={{ width: `${trimProgress}%` }}
              />
            </div>
            <span className="text-xs font-bold text-accent">{trimProgress}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
