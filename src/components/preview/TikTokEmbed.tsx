// TikTok's official blockquote embed. embed.js scans the document for
// blockquote.tiktok-embed and swaps each one for the real player.
//
// In an SPA the script is only fetched once, and on a later mount it will not
// rescan on its own, so the tag is re-injected to force a fresh pass.
import { useEffect } from "react";

const SRC = "https://www.tiktok.com/embed.js";

export type TikTokPost = {
  id: string;
  handle: string;
  caption: string;
  tags: string[];
  music: { label: string; href: string };
};

export function useTikTokEmbedScript(deps: unknown[] = []) {
  useEffect(() => {
    document.querySelectorAll(`script[src="${SRC}"]`).forEach((n) => n.remove());
    const s = document.createElement("script");
    s.async = true;
    s.src = SRC;
    document.body.appendChild(s);
    // Left in place deliberately: removing it mid-render can strand a
    // half-upgraded blockquote.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function TikTokEmbed({ post }: { post: TikTokPost }) {
  const url = `https://www.tiktok.com/@${post.handle}/video/${post.id}`;
  return (
    <blockquote
      className="tiktok-embed"
      cite={url}
      data-video-id={post.id}
      style={{ maxWidth: 605, minWidth: 325 }}
    >
      <section>
        <a target="_blank" rel="noopener noreferrer" title={`@${post.handle}`} href={`https://www.tiktok.com/@${post.handle}?refer=embed`}>
          @{post.handle}
        </a>{" "}
        {post.caption}{" "}
        {post.tags.map((t) => (
          <a
            key={t}
            title={t}
            target="_blank"
            rel="noopener noreferrer"
            href={`https://www.tiktok.com/tag/${t}?refer=embed`}
          >
            #{t}{" "}
          </a>
        ))}
        <a target="_blank" rel="noopener noreferrer" title={post.music.label} href={post.music.href}>
          {post.music.label}
        </a>
      </section>
    </blockquote>
  );
}
