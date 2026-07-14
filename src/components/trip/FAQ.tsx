import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sticker } from "@/components/brand/Sticker";
import { useSiteVariant } from "@/hooks/use-site-variant";

const DEFAULT_FAQS = [
  { q: "Will I be the only solo person?", a: "Definitely not. 82% of our guests come solo. The whole product is designed for it." },
  { q: "What's the age range?", a: "Most guests are 23–31. Nobody under 18, nobody over 39 on these specific trips." },
  { q: "Is this like Contiki?", a: "No coach buses. No 60-person mega-groups. Max 20 people, real backpacker hostels, free time built in." },
  { q: "What if I don't drink?", a: "Plenty of guests don't. The crew always plans non-drinking options for every night." },
  { q: "What if my plans change?", a: "Plans change, and that's totally okay. Swap your trip dates, gift it to someone, or save it for later with our Lifetime Deposit Guarantee." },
  { q: "What happens after I pay the deposit?", a: "You get an email with your booking reference. Once 5 travellers have booked, your trip is confirmed and we'll email you the green light to book your flights. The remaining balance is then automatically charged to the same card 7 days before departure — no action needed." },
  { q: "When is the balance due?", a: "7 days before departure. We'll email you a reminder with a payment link." },
  { q: "What if my departure doesn't reach the minimum?", a: "Every departure needs at least 5 travellers to run. If it hasn't reached 5 by 30 days before departure, we cancel it and refund your deposit in full, automatically — you don't need to do anything." },
  { q: "What's your refund policy?", a: "If you cancel: your deposit is non-refundable, and the balance is refundable up to 60 days before departure, 50% up to 30 days, none after that. If we cancel because the departure didn't reach its 5-traveller minimum, you get a full refund automatically." },
  { q: "Do I need travel insurance?", a: "Yes — it's a hard requirement. Cheap and easy with SafetyWing or World Nomads." },
];

const STUDENT_FAQS = [
  { q: "What if I'm not part of a society?", a: "No worries! This offer is open to any group of students." },
  { q: "What's the age range?", a: "Most guests are 23–31. Nobody under 18, nobody over 39 on these specific trips." },
  { q: "Is this like Contiki?", a: "No coach buses. No 60-person mega-groups. Max 20 people, real backpacker hostels, free time built in." },
  { q: "What if less than 10 people book?", a: "The 10-booking target is only for the squad leader reward. Miss it and you simply don't unlock the 2 free spots — your trip still goes ahead, as long as the departure reaches its 5-traveller minimum." },
  { q: "What happens after I pay the deposit?", a: "You get an email with your booking reference. You'll receive another email once 5 travellers have booked and your trip is confirmed. Then it's time to book your flights and pay the balance. The balance is due 7 days before departure — we'll send you a reminder." },
  { q: "When is the balance due?", a: "7 days before departure. We'll email you a reminder with a payment link." },
  { q: "What if my departure doesn't reach the minimum?", a: "Every departure needs at least 5 travellers to run. If it hasn't reached 5 by 30 days before departure, we cancel it and refund your deposit in full, automatically — you don't need to do anything." },
  { q: "What's your refund policy?", a: "If you cancel: your deposit is non-refundable, and the balance is refundable up to 60 days before departure, 50% up to 30 days, none after that. If we cancel because the departure didn't reach its 5-traveller minimum, you get a full refund automatically." },
  { q: "Do I need travel insurance?", a: "Yes — it's a hard requirement. Cheap and easy with SafetyWing or World Nomads." },
];

export function FAQ() {
  const variant = useSiteVariant();
  const FAQS = variant === "student" ? STUDENT_FAQS : DEFAULT_FAQS;
  return (
    <section className="bg-mm-orange px-5 py-12 text-mm-black md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl md:max-w-5xl">
        <Sticker color="pink" rotate={-4}>BEFORE YOU ASK</Sticker>
        <h2 className="mt-4 font-display text-[2.5rem] leading-[0.92] md:mt-6 md:text-7xl lg:text-8xl">FAQ.</h2>

        <Accordion type="single" collapsible className="mt-6 border-mm-thick bg-mm-paper md:mt-8">
          {FAQS.map((f, i) => (
            <AccordionItem
              value={`f${i}`}
              key={i}
              className={i < FAQS.length - 1 ? "border-b-[3px] border-mm-black" : "border-b-0"}
            >
              <AccordionTrigger className="px-3 py-3.5 text-left font-display text-[13px] uppercase leading-tight hover:no-underline md:px-4 md:py-4 md:text-base">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="px-3 pb-3.5 text-[13px] leading-snug text-mm-black/80 md:px-4 md:pb-4 md:text-sm">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

      </div>
    </section>
  );
}
