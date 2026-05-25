import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
    <section className="bg-muted/40 px-5 py-14">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-['Archivo_Black'] text-3xl">FAQ</h2>
        <Accordion type="single" collapsible className="mt-6">
          {FAQS.map((f, i) => (
            <AccordionItem value={`f${i}`} key={i}>
              <AccordionTrigger className="text-left text-sm font-semibold">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
