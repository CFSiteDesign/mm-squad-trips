import { MessageCircle } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="bg-secondary px-5 py-10 text-secondary-foreground">
      <div className="mx-auto max-w-2xl">
        <a
          href="https://wa.me/855000000000"
          className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-foreground"
        >
          <MessageCircle className="h-4 w-4" />
          Chat on WhatsApp
        </a>
        <nav className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-secondary-foreground/80">
          <a href="/terms" className="hover:text-secondary-foreground">Terms</a>
          <a href="/privacy" className="hover:text-secondary-foreground">Privacy</a>
          <a href="mailto:hello@madmonkeyhostels.com" className="hover:text-secondary-foreground">Contact</a>
        </nav>
        <p className="mt-6 text-xs text-secondary-foreground/60">
          © {new Date().getFullYear()} Mad Monkey Hostels · Group Trips
        </p>
      </div>
    </footer>
  );
}
