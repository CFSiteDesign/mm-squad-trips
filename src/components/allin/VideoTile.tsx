// Self-hosted traveller videos. The client wants the clips to just play,
// without TikTok's embed chrome, so these are plain <video> elements.
//
// Desktop: muted, looping, autoplaying inline, and the whole tile links out
// to the original post.
//
// Mobile (Kyle, 4 Sep 2026): no autoplay. The tile shows the first frame and
// a play button; a tap plays the clip inline with sound, another tap pauses.
// Starting one clip pauses the others. The TikTok link moves down to the
// caption strip so tapping the video doesn't leave the page.
//
// If the MP4 hasn't been dropped in yet the tile falls back to a visible
// "pending" state that still links to TikTok, rather than rendering an empty
// black box.
import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { publicUrl } from "@/lib/base-path";
import { MOBILE_BREAKPOINT } from "@/hooks/use-mobile";

export type Clip = {
  /** File under /public/videos, without the extension. */
  file: string;
  /** Original post, opened in a new tab. */
  href: string;
  handle: string;
  caption: string;
};

const mobileQuery = () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

/**
 * Same breakpoint as useIsMobile, but read synchronously on the first render:
 * that hook starts as false, which would hand a phone one autoplaying frame
 * before flipping.
 */
function useTapToPlay() {
  const [tap, setTap] = useState(() => typeof window !== "undefined" && mobileQuery().matches);
  useEffect(() => {
    const mql = mobileQuery();
    const onChange = () => setTap(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return tap;
}

export function VideoTile({ clip, className = "" }: { clip: Clip; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [missing, setMissing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const tapToPlay = useTapToPlay();

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (tapToPlay) {
      v.pause();
    } else {
      // Autoplay can still be refused; a refusal is not a missing file.
      v.muted = true;
      v.play().catch(() => {});
    }
  }, [tapToPlay]);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      document.querySelectorAll<HTMLVideoElement>("video[data-video-tile]").forEach((o) => {
        if (o !== v) o.pause();
      });
      v.muted = false;
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  };

  const frame = `overflow-hidden border-[3px] border-mm-black bg-mm-black shadow-mm-sm ${className}`;
  // On phones the src carries a tiny offset so Safari paints the first frame
  // as the poster instead of a black box.
  const src = publicUrl(`videos/${clip.file}.mp4`) + (tapToPlay ? "#t=0.001" : "");

  const pending = (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 border-dashed bg-mm-black/90 p-6 text-center">
      <span className="font-sticker text-[10px] tracking-[0.14em] text-mm-bone/60">VIDEO PENDING</span>
      <span className="text-xs text-mm-bone/40">Drop {clip.file}.mp4 into /public/videos</span>
    </div>
  );

  const video = (
    <video
      ref={ref}
      data-video-tile=""
      className="h-full w-full object-cover"
      src={src}
      muted={!tapToPlay}
      loop
      autoPlay={!tapToPlay}
      playsInline
      preload="metadata"
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onError={() => setMissing(true)}
    />
  );

  const captionText = (
    <>
      <p className="font-sticker text-[9px] tracking-[0.14em] text-mm-bone/70">WATCH ON TIKTOK</p>
      <p className="mt-0.5 font-display text-base leading-none text-mm-bone">@{clip.handle}</p>
    </>
  );

  if (tapToPlay) {
    return (
      <div className={`relative block ${frame}`}>
        {missing ? (
          <a href={clip.href} target="_blank" rel="noopener noreferrer" className="block h-full w-full">{pending}</a>
        ) : (
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? `Pause @${clip.handle}` : `Play @${clip.handle}`}
            className="relative block h-full w-full"
          >
            {video}
            {!playing && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-16 w-16 items-center justify-center border-[3px] border-mm-black bg-mm-pink shadow-mm-sm">
                  <Play className="ml-1 h-7 w-7 fill-mm-black text-mm-black" />
                </span>
              </span>
            )}
          </button>
        )}
        <a
          href={clip.href}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-mm-black/85 to-transparent p-4"
        >
          {captionText}
        </a>
      </div>
    );
  }

  return (
    <a
      href={clip.href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block transition-transform duration-200 hover:-translate-y-1.5 ${frame}`}
    >
      {missing ? pending : video}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-mm-black/85 to-transparent p-4">
        {captionText}
      </div>
    </a>
  );
}
