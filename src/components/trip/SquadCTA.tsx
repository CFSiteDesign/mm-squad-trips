export function SquadCTA() {
  return (
    <section className="relative overflow-hidden bg-mm-black pt-16 pb-10 text-mm-bone md:pt-20 md:pb-12">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <span className="font-sticker text-[10px] tracking-[0.24em] text-mm-bone/70">
          SQUAD LEADER PROGRAM
        </span>
        <h2 className="mt-4 font-display text-4xl uppercase leading-[0.95] tracking-tight md:text-6xl lg:text-7xl">
          Earn a free trip?<br />
          <span className="text-mm-lime">Bring your squad.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base text-mm-bone/80 md:text-lg">
          Apply to become a Mad Monkey Squad Leader. Organize the vibes, we'll handle the rest.
        </p>
        <a
          href="#booking"
          onClick={(e) => { e.preventDefault(); document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" }); }}
          className="mt-8 inline-flex items-center gap-2 border-mm-thick border-mm-bone bg-mm-pink px-7 py-3.5 font-display text-base text-mm-bone shadow-mm-bone transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px]"
        >
          Become a Squad Leader →
        </a>
      </div>
    </section>
  );
}
