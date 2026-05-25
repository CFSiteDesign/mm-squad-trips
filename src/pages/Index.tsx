import { Link } from "react-router-dom";

const TRIPS = [
  { slug: "indonesia", name: "Indonesia Island Hopping", route: "Bali → Gili T → Lombok", days: 12, price: 700 },
  { slug: "cambodia", name: "Cambodia Coast to Coast", route: "Phnom Penh → Siem Reap → Koh Rong → Koh Sdach", days: 14, price: 650 },
  { slug: "vietnam", name: "Vietnam North Loop", route: "Hanoi → Ha Giang → Cao Bang → Halong → Hanoi", days: 10, price: 750 },
];

export default function Index() {
  return (
    <main className="min-h-screen bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-2xl px-5 py-16">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">Mad Monkey · Group Trips</p>
        <h1 className="mt-3 font-['Archivo_Black'] text-[clamp(2.5rem,10vw,4.5rem)] leading-[0.95]">
          Solo traveller?
          <br />
          Not for long.
        </h1>
        <p className="mt-4 text-base text-secondary-foreground/80">
          Three packaged backpacker trips through SE Asia. Real Mad Monkey hostels every night. Pick one.
        </p>

        <ul className="mt-10 space-y-3">
          {TRIPS.map((t) => (
            <li key={t.slug}>
              <Link
                to={`/${t.slug}`}
                className="group flex items-center justify-between rounded-2xl bg-white/5 p-5 transition hover:bg-white/10"
              >
                <div>
                  <h2 className="font-['Archivo_Black'] text-2xl">{t.name}</h2>
                  <p className="mt-1 text-sm text-secondary-foreground/70">{t.route}</p>
                  <p className="mt-2 text-xs text-secondary-foreground/60">
                    {t.days} days · from ${t.price}
                  </p>
                </div>
                <span className="text-accent transition group-hover:translate-x-1">→</span>
              </Link>
            </li>
          ))}
        </ul>

        <p className="mt-12 text-xs text-secondary-foreground/60">
          53,000+ in our community · 24/7 local crew · $99 deposit holds your spot
        </p>
      </div>
    </main>
  );
}
