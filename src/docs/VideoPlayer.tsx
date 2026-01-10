import { MediaPlayer, MediaProvider } from "@vidstack/react";
import "@vidstack/react/player/styles/default/layouts/video.css";
import "@vidstack/react/player/styles/default/theme.css";
import { ComponentProps, useRef, useState } from "react";

import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default";

export function VideoPlayerFigure({
  caption = "",
  ...props
}: { caption?: string } & ComponentProps<typeof VideoPlayer>) {
  return (
    <figure className="bg-card border border-border rounded-lg p-4">
      <VideoPlayer
        src="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/create-workspace/stream.m3u8"
        thumbnails="https://pub-d8a7f3e39c4e457da52f43047c6edf27.r2.dev/videos/create-workspace/thumbnails.vtt"
        title="Create Workspace"
      />
      <figcaption className="mt-4 text-center text-sm text-muted-foreground">{caption}</figcaption>
    </figure>
  );
}

export function VideoPlayer({
  src = "https://files.vidstack.io/sprite-fight/hls/stream.m3u8",
  thumbnails = "https://files.vidstack.io/sprite-fight/thumbnails.vtt",
  title,
}: {
  src: string;
  thumbnails?: string;
  title?: string;
}) {
  const [isModal, setIsModal] = useState(false);
  const [savedTime, setSavedTime] = useState(0);
  const playerRef = useRef<any>(null);

  const toggleModal = () => {
    // Capture current time and pause the video
    if (playerRef.current) {
      const currentTime = playerRef.current.currentTime;
      setSavedTime(currentTime);
      playerRef.current.pause();
    }
    setIsModal(!isModal);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      toggleModal();
    }
  };

  const handlePlayerReady = () => {
    // Restore the saved time when player is ready
    if (playerRef.current && savedTime > 0) {
      playerRef.current.currentTime = savedTime;
    }
  };

  return (
    <>
      {/* Inline Video Player */}
      {!isModal && (
        <div className="relative w-full max-w-lg [&_.vds-time]:translate-y-[-26px] group">
          <MediaPlayer
            ref={playerRef}
            title={title}
            src={src}
            className="w-full aspect-video rounded-lg overflow-hidden"
            crossOrigin="anonymous"
            playsInline
            load="eager"
            autoPlay={false}
            controls
            onCanPlay={handlePlayerReady}
          >
            <MediaProvider>
              {src.includes(".m3u8") && <source src={src} type="application/x-mpegURL" />}
              {src.includes(".mp4") && <source src={src} type="video/mp4" />}
            </MediaProvider>
            <DefaultVideoLayout thumbnails={thumbnails} icons={defaultLayoutIcons} />
          </MediaPlayer>

          {/* Expand Button */}
          <button
            onClick={toggleModal}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
            title="Open in modal"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3" />
              <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
              <path d="M3 16v3a2 2 0 0 0 2 2h3" />
              <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          </button>
        </div>
      )}

      {/* Modal Video Player */}
      {isModal && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={handleBackdropClick}
        >
          <div className="relative w-full max-w-6xl mx-auto [&_.vds-time]:translate-y-[-26px]">
            <MediaPlayer
              ref={playerRef}
              title={title}
              src={src}
              className="w-full aspect-video rounded-lg overflow-hidden"
              crossOrigin="anonymous"
              playsInline
              load="eager"
              autoPlay={false}
              controls
              onCanPlay={handlePlayerReady}
            >
              <MediaProvider>
                {src.includes(".m3u8") && <source src={src} type="application/x-mpegURL" />}
                {src.includes(".mp4") && <source src={src} type="video/mp4" />}
              </MediaProvider>
              <DefaultVideoLayout thumbnails={thumbnails} icons={defaultLayoutIcons} />
            </MediaPlayer>

            {/* Close Button */}
            <button
              onClick={toggleModal}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 transition-colors duration-200"
              title="Close modal"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18" />
                <path d="M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
