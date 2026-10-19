import { Link, useLocation } from "react-router-dom";
import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/utils";
import { useTravellerMode } from "@/lib/traveller-mode";
import { ModePill } from "@/components/allin/ModeGate";
import { publicUrl } from "@/lib/base-path";
import { Route } from "lucide-react";

export function Navbar() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const { mode, chosen } = useTravellerMode();

  return (
    <header className="fixed left-0 right-0 top-0 z-50 bg-mm-black/95 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between px-4 md:h-16 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <Wordmark size={24} className="md:hidden" />
          <Wordmark size={36} className="hidden md:block" />
        </Link>

        <nav className="flex items-center gap-2 sm:gap-3 md:gap-6">
          <ModePill />
          <Link
            to="/"
            className={cn(
              "font-display text-xs tracking-[0.12em] transition-colors md:text-sm",
              isHome ? "text-mm-lime" : "text-mm-bone hover:text-mm-lime",
              // The wordmark already goes home; on a phone the pill needs the room.
              chosen && "hidden sm:inline"
            )}
          >
            HOME
          </Link>

          {/* Ewan's trip builder (public/trip-builder, 19 Oct 2026): a static app, so a full page load, not a router link. */}
          <a
            href={publicUrl("trip-builder/")}
            aria-label="Build your trip"
            title="Build your trip"
            className="inline-flex items-center border-[3px] border-mm-lime p-1 font-display text-[10px] text-mm-lime transition-colors hover:bg-mm-lime hover:text-mm-black sm:px-2 md:px-3 md:py-1.5 md:text-sm"
          >
            {/* On a phone the header has no room for words: an icon, the label from sm up. */}
            <Route className="h-4 w-4 sm:hidden" strokeWidth={2.5} aria-hidden="true" />
            <span className="hidden sm:inline">BUILD YOUR TRIP</span>
          </a>

          {mode !== "independent" && (
          <Link
            to="/squad-leader"
            className="inline-flex items-center border-[3px] border-mm-bone bg-mm-pink px-2.5 py-1.5 font-display text-[10px] text-mm-bone shadow-mm transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] md:px-4 md:py-2 md:text-sm"
          >
            BECOME A SQUAD LEADER →
          </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
