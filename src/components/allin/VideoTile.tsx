// Self-hosted traveller videos. The client wants the clips to just play,
// without TikTok's embed chrome, so these are plain <video> elements: muted,
// looping, autoplaying inline, with a link out to the original post.
//
// If the MP4 hasn't been dropped in yet the tile falls back to a visible
// "pending" state that still links to TikTok, rather than rendering an empty
// black box.
import { useEffect, useRef, useState } from "react";
import { publicUrl } from "@/lib/base-path";

export type Clip = {
  /** File under /public/videos, without the extension. */
  file: string;
  /** Original post, opened in a new tab. */
  href: string;
  handle: string;
  caption: string;
};

export function VideoTile({ clip, className = "" }: { clip: Clip; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    // Autoplay can still be refused; a refusal is not a missing file.
    ref.current?.play().catch(() => {});
  }, []);

  return (
    <a
      href={clip.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block overflow-hidden border-[3px] border-mm-black bg-mm-black shadow-mm-sm transition-transform duration-200 hover:-translate-y-1.5 ${className}`}
    >
      {missing ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 border-dashed bg-mm-black/90 p-6 text-center">
          <span className="font-sticker text-[10px] tracking-[0.14em] text-mm-bone/60">VIDEO PENDING</span>
          <span className="text-xs text-mm-bone/40">Drop {clip.file}.mp4 into /public/videos</span>
        </div>
      ) : (
        <video
          ref={ref}
          className="h-full w-full object-cover"
          src={publicUrl(`videos/${clip.file}.mp4`)}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          onError={() => setMissing(true)}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-mm-black/85 to-transparent p-4">
        <p className="font-sticker text-[9px] tracking-[0.14em] text-mm-bone/70">WATCH ON TIKTOK</p>
        <p className="mt-0.5 font-display text-base leading-none text-mm-bone">@{clip.handle}</p>
      </div>
    </a>
  );
}
