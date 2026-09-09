// Self-hosted traveller videos. The client wants the clips to just play,
// without TikTok's embed chrome, so these are plain <video> elements.
//
// Desktop: muted, looping, autoplaying inline, and the whole tile links out
// to the original post.
//
// Mobile (Kyle, 4 Sep 2026): no autoplay. The tile shows the poster frame and
// a play button; a tap plays the clip inline with sound, another tap pauses.
// Starting one clip pauses the others. The TikTok link moves down to the
// caption strip so tapping the video doesn't leave the page.
//
// HOW THE FILE IS LOADED (9 Sep 2026). Lovable's hosting, and the Cloudflare
// rewrite in front of it, answer byte-range requests with a plain 200 and no
// Accept-Ranges. Safari, so every iPhone, refuses to play media from a server
// that does that: the element fires `error`, and the tile showed "VIDEO
// PENDING" while Chrome played the same file. So on phones the clip is fetched
// whole once the tile is near the viewport (they are 1-2 MB, moov atom at the
// front) and handed to the element as a blob URL, which Safari can range into
// locally. Desktop tries the direct URL first and falls back to the same blob
// route on error. Only a failed fetch (the file is not there) shows the
// pending state. Posters are first frames pulled with ffmpeg, next to the MP4s.
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

/** The whole clip as an object URL, or null when the file is not there. */
async function fetchAsBlobUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return URL.createObjectURL(await res.blob());
  } catch {
    return null;
  }
}

export function VideoTile({ clip, className = "" }: { clip: Clip; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [missing, setMissing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const tapToPlay = useTapToPlay();

  const fileUrl = publicUrl(`videos/${clip.file}.mp4`);
  const poster = publicUrl(`videos/${clip.file}.jpg`);
  // Direct URL on desktop; nothing on phones until the blob is ready.
  const [src, setSrc] = useState<string | null>(() => (tapToPlay ? null : fileUrl));

  const blobUrl = useRef<string | null>(null);
  const fetching = useRef(false);
  const playWhenReady = useRef(false);

  const loadBlob = () => {
    if (fetching.current || blobUrl.current) return;
    fetching.current = true;
    fetchAsBlobUrl(fileUrl).then((url) => {
      fetching.current = false;
      if (!url) {
        setMissing(true);
        return;
      }
      blobUrl.current = url;
      setSrc(url);
    });
  };
  useEffect(() => () => {
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
  }, []);

  // Phones: start the fetch once the tile is within a screen of the viewport,
  // so the clip is usually there before anyone taps.
  useEffect(() => {
    if (!tapToPlay) {
      if (!src && !blobUrl.current) setSrc(fileUrl);
      return;
    }
    const el = box.current;
    if (!el || src) return;
    if (!("IntersectionObserver" in window)) {
      loadBlob();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadBlob();
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tapToPlay, src]);

  useEffect(() => {
    const v = ref.current;
    if (!v || !src) return;
    if (tapToPlay) {
      if (playWhenReady.current) {
        playWhenReady.current = false;
        v.muted = false;
        v.play().catch(() => {});
      }
    } else {
      // Autoplay can still be refused; a refusal is not a missing file.
      v.muted = true;
      v.play().catch(() => {});
    }
  }, [tapToPlay, src]);

  const onError = () => {
    // The direct URL was refused (Safari on a server without range support):
    // go the blob route once. A blob that fails is a file that is not there.
    if (src === fileUrl) {
      setSrc(null);
      loadBlob();
    } else {
      setMissing(true);
    }
  };

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (!src) {
      playWhenReady.current = true;
      loadBlob();
      return;
    }
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
      src={src ?? undefined}
      poster={poster}
      muted={!tapToPlay}
      loop
      autoPlay={!tapToPlay}
      playsInline
      preload="metadata"
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onError={onError}
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
      <div ref={box} className={`relative block ${frame}`}>
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
