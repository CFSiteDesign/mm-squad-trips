import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sticker } from "@/components/brand/Sticker";

const FAQS = [
  { q: "Will I be the only solo person?", a: "Definitely not. 82% of our guests come solo. The whole product is designed for it." },
  { q: "What's the age range?", a: "Most guests are 23–31. Nobody under 18, nobody over 39 on these specific trips." },
  { q: "Is this like Contiki?", a: "No coach buses. No 60-person mega-groups. Max 20 people, real backpacker hostels, free time built in." },
  { q: "What if I don't drink?", a: "Plenty of guests don't. The crew always plans non-drinking options for every night." },
  { q: "What happens after I pay the deposit?", a: "You get an email with your booking reference. The balance is due 60 days before your departure." },
  { q: "When is the balance due?", a: "60 days before departure. We'll email you a reminder 75 days out with a payment link." },
  { q: "What's your refund policy?", a: "Deposit is non-refundable. Full balance refundable up to 60 days before departure, 50% up to 30 days, none after that." },
  { q: "Do I need travel insurance?", a: "Yes — it's a hard requirement. Cheap and easy with SafetyWing or World Nomads." },
];

export function FAQ() {
  return (
    <section className="bg-mm-yellow px-6 py-20 text-mm-black">
      <div className="mx-auto max-w-3xl">
        <Sticker color="purple" rotate={-4}>BEFORE YOU ASK</Sticker>
        <h2 className="mt-4 font-display text-5xl md:text-6xl">FAQ.</h2>

        <Accordion type="single" collapsible className="mt-8 border-mm-thick bg-mm-paper">
          {FAQS.map((f, i) => (
            <AccordionItem
              value={`f${i}`}
              key={i}
              className={i < FAQS.length - 1 ? "border-b-[3px] border-mm-black" : "border-b-0"}
            >
              <AccordionTrigger className="px-4 py-4 text-left font-display text-base uppercase hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 text-sm text-mm-black/80">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
