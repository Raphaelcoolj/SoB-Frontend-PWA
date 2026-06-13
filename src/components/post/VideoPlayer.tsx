'use client';

/**
 * @file VideoPlayer.tsx
 * @description HLS.js-powered video player for Mux stream URLs.
 * Lazy-loads the HLS stream only when the video enters the viewport
 * using the Intersection Observer API for performance.
 * Falls back to native HTML5 video if HLS is not supported.
 */

import React, { useRef, useEffect, useState } from 'react';

interface VideoPlayerProps {
  playbackId: string;
  className?: string;
}

export default function VideoPlayer({ playbackId, className = '' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mux stream URL format
  const streamUrl = `https://stream.mux.com/${playbackId}.m3u8`;

  // Observe when this component enters viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Initialize HLS.js once the component is visible
  useEffect(() => {
    if (!isVisible || !videoRef.current) return;

    const video = videoRef.current;

    const initHLS = async () => {
      try {
        // Dynamically import HLS.js to avoid SSR issues
        const Hls = (await import('hls.js')).default;

        if (Hls.isSupported()) {
          const hls = new Hls({
            startLevel: -1, // auto quality
            maxBufferLength: 30,
          });

          hls.loadSource(streamUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              setError('Failed to load video. Please try again.');
            }
          });

          return () => hls.destroy();
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari, iOS)
          video.src = streamUrl;
        } else {
          setError('Your browser does not support HLS video playback.');
        }
      } catch (err) {
        console.error('HLS.js init error:', err);
        setError('Failed to initialize video player.');
      }
    };

    const cleanup = initHLS();
    return () => {
      cleanup.then((fn) => fn?.());
    };
  }, [isVisible, streamUrl]);

  return (
    <div ref={containerRef} className={`relative bg-black rounded-xl overflow-hidden ${className}`}>
      {error ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
          <p>{error}</p>
        </div>
      ) : (
        <>
          {!isVisible && (
            <div className="flex items-center justify-center h-48 bg-muted animate-pulse">
              <svg className="w-10 h-10 text-muted-foreground/50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          )}
          <video
            ref={videoRef}
            controls
            playsInline
            className="w-full max-h-[400px] object-contain"
            style={{ display: isVisible ? 'block' : 'none' }}
          />
        </>
      )}
    </div>
  );
}

