import { Link } from "react-router-dom";
import { Wordmark } from "@/components/brand/Wordmark";
import { useSiteVariant, squadPath } from "@/hooks/use-site-variant";

export function SiteFooter() {
  const variant = useSiteVariant();
  const isStudent = variant === "student";
  return (
    <>
      {isStudent && (
        <section className="bg-mm-pink px-5 py-14 text-mm-bone md:px-8 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-[2.25rem] uppercase leading-[0.95] tracking-tight md:text-5xl">
              WANT 2 FREE SPOTS?<br />
              <span className="text-mm-lime">BRING YOUR SQUAD.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[14px] leading-snug text-mm-bone/90 md:text-base">
              Apply to be a Mad Monkey Student Squad Leader. You bring the crew. We'll handle the rest.
            </p>
            <Link
              to={squadPath("", variant)}
              className="mt-6 inline-flex items-center border-[3px] border-mm-bone bg-mm-black px-6 py-3 font-display text-sm text-mm-bone shadow-mm transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] md:mt-8"
            >
              APPLY NOW →
            </Link>
          </div>
        </section>
      )}
      <footer className="relative bg-mm-black px-5 pt-8 pb-6 text-mm-bone md:px-6 md:pb-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-6">
          <div>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 font-sticker text-[11px] tracking-[0.2em] text-mm-bone/70">
              <a href="https://madmonkeyhostels.com/terms-and-conditions/" target="_blank" rel="noopener noreferrer" className="hover:text-mm-lime">TERMS</a>
              <a href="https://madmonkeyhostels.com/privacy-policy/" target="_blank" rel="noopener noreferrer" className="hover:text-mm-lime">PRIVACY</a>
              <a href="https://madmonkeyhostels.com/cancellation-policy/" target="_blank" rel="noopener noreferrer" className="hover:text-mm-lime">CANCELLATION</a>
              <a href="mailto:hello@madmonkeyhostels.com" className="hover:text-mm-lime">CONTACT</a>
            </nav>
            <p className="mt-6 font-sticker text-[10px] tracking-[0.22em] text-mm-bone/50">
              © {new Date().getFullYear()} MAD MONKEY HOSTELS · GROUP TRIPS
            </p>
          </div>
          <Wordmark size={40} />
        </div>
      </footer>
    </>
  );
}
