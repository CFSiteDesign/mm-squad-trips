import { Link, useLocation } from "react-router-dom";
import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <header className="fixed left-0 right-0 top-0 z-50 bg-mm-black/95 backdrop-blur-sm">
      <div className="flex h-14 items-center justify-between px-4 md:h-16 md:px-8">
        <Link to="/" className="flex items-center gap-3">
          <Wordmark size={28} className="md:hidden" />
          <Wordmark size={44} className="hidden md:block" />
        </Link>

        <nav className="flex items-center gap-4 md:gap-6">
          <Link
            to="/"
            className={cn(
              "font-display text-xs tracking-[0.12em] transition-colors md:text-sm",
              isHome ? "text-mm-lime" : "text-mm-bone hover:text-mm-lime"
            )}
          >
            HOME
          </Link>

          <Link
            to="/squad-leader"
            className="inline-flex items-center border-[3px] border-mm-bone bg-mm-pink px-2.5 py-1.5 font-display text-[10px] text-mm-bone shadow-mm transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] md:px-4 md:py-2 md:text-sm"
          >
            BECOME A SQUAD LEADER →
          </Link>
        </nav>
      </div>
    </header>
  );
}
