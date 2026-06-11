import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Navbar() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <nav className="absolute left-0 right-0 top-0 z-50 flex items-center justify-between px-4 pt-3 md:px-8 md:pt-4">
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className={cn(
            "font-display text-xs tracking-[0.12em] transition-colors md:text-sm",
            isHome ? "text-mm-lime" : "text-mm-bone hover:text-mm-lime"
          )}
        >
          HOME
        </Link>
      </div>
    </nav>
  );
}
