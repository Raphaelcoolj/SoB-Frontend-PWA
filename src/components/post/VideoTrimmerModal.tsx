'use client';

// NEW: Video trimming modal component
import React, { useState, useRef, useEffect } from 'react';
import { X, Play, Pause, Scissors, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface VideoTrimmerModalProps {
  file: File;
  isOpen: boolean;
  onClose: () => void;
  onTrimComplete: (trimmedFile: File) => void;
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
      setEndTime(Math.min(duration, 60));
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
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setStartTime(val);
    if (endTime - val > 60) {
      setEndTime(val + 60);
    }
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setEndTime(val);
    if (val - startTime > 60) {
      setStartTime(val - 60);
    }
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const startTrimming = async () => {
    setIsTrimming(true);
    setTrimProgress(0);

    const video = document.createElement('video');
    video.src = videoUrl;
    video.crossOrigin = 'anonymous';
    video.muted = false;
    video.playsInline = true;
    video.style.display = 'none';
    document.body.appendChild(video);

    video.onloadedmetadata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        setIsTrimming(false);
        alert('Trimming failed: Context error');
        document.body.removeChild(video);
        return;
      }

      // Configure silent audio extraction via Web Audio API
      let audioCtx: AudioContext | null = null;
      let dest: MediaStreamAudioDestinationNode | null = null;
      let source: MediaElementAudioSourceNode | null = null;

      try {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtx = new AudioContextClass();
        dest = audioCtx.createMediaStreamDestination();
        source = audioCtx.createMediaElementSource(video);
        source.connect(dest);
      } catch (err) {
        console.warn('Audio Context capture failed, proceeding without audio:', err);
      }

      // Seek to starting position
      video.currentTime = startTime;

      video.onseeked = () => {
        const canvasStream = canvas.captureStream(30); // 30 FPS
        const combinedStream = new MediaStream();

        // Feed video track
        combinedStream.addTrack(canvasStream.getVideoTracks()[0]);

        // Feed audio track if Web Audio succeeded
        if (dest && dest.stream.getAudioTracks().length > 0) {
          combinedStream.addTrack(dest.stream.getAudioTracks()[0]);
        }

        // Setup recorder options
        let options = { mimeType: 'video/webm;codecs=vp9,opus' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'video/webm;codecs=vp8,opus' };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: 'video/webm' };
        }
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
          options = { mimeType: '' };
        }

        const recorder = new MediaRecorder(combinedStream, options);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (evt) => {
          if (evt.data && evt.data.size > 0) {
            chunks.push(evt.data);
          }
        };

        recorder.onstop = async () => {
          try {
            cancelAnimationFrame(drawFrameId);
            video.pause();
            document.body.removeChild(video);
            if (audioCtx) {
              await audioCtx.close();
            }

            const blob = new Blob(chunks, { type: 'video/webm' });
            const trimmedFile = new File(
              [blob],
              `trimmed_${file.name.split('.')[0] || 'video'}.webm`,
              { type: 'video/webm' }
            );

            setIsTrimming(false);
            onTrimComplete(trimmedFile);
          } catch (err) {
            console.error('Trim compilation error:', err);
            setIsTrimming(false);
          }
        };

        let drawFrameId: number;
        const totalDuration = endTime - startTime;

        const drawFrame = () => {
          const currentOffset = video.currentTime - startTime;
          const pct = Math.min((currentOffset / totalDuration) * 100, 100);
          setTrimProgress(Math.floor(pct));

          if (video.currentTime >= endTime || video.ended) {
            recorder.stop();
            return;
          }

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          drawFrameId = requestAnimationFrame(drawFrame);
        };

        recorder.start();
        video.play();
        drawFrame();
      };
    };

    video.onerror = () => {
      setIsTrimming(false);
      alert('Failed to load video file for trimming.');
      document.body.removeChild(video);
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
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground font-medium">
                <span>Start: {startTime.toFixed(1)}s</span>
                <span className={trimLength > 60 ? 'text-destructive font-bold' : 'text-accent'}>
                  Selected Duration: {trimLength.toFixed(1)}s (Max: 60s)
                </span>
                <span>End: {endTime.toFixed(1)}s</span>
              </div>

              {/* Sliders */}
              <div className="space-y-2 pt-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Start Handle</label>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration}
                    step={0.1}
                    value={startTime}
                    onChange={handleStartChange}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">End Handle</label>
                  <input
                    type="range"
                    min={0}
                    max={videoDuration}
                    step={0.1}
                    value={endTime}
                    onChange={handleEndChange}
                    className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-accent"
                  />
                </div>
              </div>
            </div>

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
