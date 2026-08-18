// Shared furniture for the /preview-* demo pages.
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

/**
 * Sticky sub-navigation. Horizontal tabs on desktop, a scrollable pill row on
 * mobile. Tracks the section in view and offsets anchor jumps so headings don't
 * land underneath the bar.
 */
export function SubNav({ sections }: { sections: { id: string; label: string }[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      // Top band only, so "active" means "heading is near the top of the screen"
      // rather than "any part of the section is on screen".
      { rootMargin: "-96px 0px -70% 0px", threshold: 0 },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
  }, [sections]);

  const go = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 88;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <nav className="sticky top-[30px] z-50 border-y-[3px] border-mm-black bg-mm-bone">
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:justify-start md:gap-2 md:px-6">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => go(s.id)}
            className={`whitespace-nowrap border-[3px] border-mm-black px-3 py-2 font-sticker text-[10px] tracking-[0.12em] transition-colors md:text-[11px] ${
              active === s.id
                ? "bg-mm-pink text-mm-black shadow-mm-sm"
                : "bg-transparent text-mm-black hover:bg-mm-lime"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

/** Persistent mobile CTA. Desktop uses the floating booking card instead. */
export function StickyCta({ onClick, label = "RESERVE FOR $99" }: { onClick: () => void; label?: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t-[4px] border-mm-black bg-mm-bone p-3 md:hidden">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-center gap-2 border-[3px] border-mm-black bg-mm-pink px-5 py-3.5 font-sticker text-xs tracking-[0.14em] text-mm-black shadow-mm-sm"
      >
        {label} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Placeholder tile for a highlight whose photo hasn't been supplied yet. */
export function PhotoPending({ title }: { title: string }) {
  return (
    <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 border-[3px] border-dashed border-mm-black/40 bg-mm-black/5 p-4 text-center">
      <span className="font-sticker text-[10px] tracking-[0.14em] text-mm-black/60">PHOTO PENDING</span>
      <span className="text-xs text-mm-black/50">{title}</span>
    </div>
  );
}

/** Visible marker for a section with no content supplied yet. */
export function PendingPanel({ label }: { label: string }) {
  return (
    <div className="mb-4 flex items-center justify-center border-[3px] border-dashed border-mm-black/40 bg-mm-black/5 p-6 text-center">
      <span className="font-sticker text-[10px] tracking-[0.14em] text-mm-black/60">{label.toUpperCase()}</span>
    </div>
  );
}
