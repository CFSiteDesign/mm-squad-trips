import { Wordmark } from "@/components/brand/Wordmark";

export function SiteFooter() {
  return (
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
  );
}
