// Per-trip "final details" block injected into the 7-day reminder emails.
// WhatsApp links are placeholders — swap in real ones when provided.

type TripFinalDetails = {
  whatsappUrl: string;
  finalDetailsHtml: string;
};

function block(title: string, items: string[]): string {
  return `<div style="margin:18px 0;padding:16px;border:2px solid #0a0a0a;background:#ffffff">
<div style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:10px">${title}</div>
<ul style="margin:0;padding:0 0 0 18px;font-size:14px;line-height:1.6">
${items.map((i) => `<li style="margin-bottom:6px">${i}</li>`).join("")}
</ul>
</div>`;
}

const TRIP_DETAILS: Record<string, TripFinalDetails> = {
  vietnam: {
    whatsappUrl: "https://wa.me/00000000000", // TODO: replace
    finalDetailsHtml: block("Final details — Vietnam", [
      "<strong>Meeting point:</strong> Mad Monkey Hanoi (Old Quarter). Free pre-trip night included — arrive Sunday before departure.",
      "<strong>Welcome drinks:</strong> 7pm at the hostel bar on Sunday.",
      "<strong>Day-1 kick-off:</strong> 9am Monday — Old Quarter walking tour. Don't be late, the bia hoi won't wait.",
      "<strong>What to pack:</strong> light layers + warm jacket for Ha Giang (cold at altitude), swimwear for Lan Ha Bay, sturdy shoes, rain shell, reef-safe sunscreen.",
      "<strong>Cash:</strong> bring ~$150 USD or equivalent VND for tips, optional add-ons and street food.",
      "<strong>Weather right now:</strong> mixed — check the forecast for Hanoi + Ha Giang the day before you fly.",
      "<strong>Nearest airport:</strong> arrive into HAN (Hanoi). Depart from DAD (Danang) — we can help with transfers.",
    ]),
  },
  indonesia: {
    whatsappUrl: "https://wa.me/00000000000", // TODO: replace
    finalDetailsHtml: block("Final details — Indonesia", [
      "<strong>Meeting point:</strong> Mad Monkey Uluwatu. Free pre-trip night included — arrive Sunday before departure.",
      "<strong>Welcome drinks:</strong> 6pm at the cliffside bar on Sunday.",
      "<strong>Day-1 kick-off:</strong> 8:30am Monday — surf lesson at Padang Padang. Bring swimwear.",
      "<strong>What to pack:</strong> swimwear x3, reef-safe sunscreen, light layers, sandals + closed shoes for hikes, dry bag for boats.",
      "<strong>Cash:</strong> bring ~$200 USD or equivalent IDR for boats, scooters, tips and warungs.",
      "<strong>Weather right now:</strong> hot + humid; possible afternoon showers. Pack a light rain shell.",
      "<strong>Nearest airport:</strong> arrive into DPS (Bali Denpasar). Depart from LOP (Lombok) — easy transfer.",
    ]),
  },
  cambodia: {
    whatsappUrl: "https://wa.me/00000000000", // TODO: replace
    finalDetailsHtml: block("Final details — Cambodia", [
      "<strong>Meeting point:</strong> Mad Monkey Phnom Penh. Free pre-trip night included — arrive Sunday before departure.",
      "<strong>Welcome drinks:</strong> 7pm at the rooftop bar on Sunday.",
      "<strong>Day-1 kick-off:</strong> 9am Monday — Killing Fields + S21 tour. Wear something respectful.",
      "<strong>What to pack:</strong> light cotton clothes, modest cover-up for temples (shoulders + knees), trainers for Angkor, swimwear for Sihanoukville, mozzy spray.",
      "<strong>Cash:</strong> USD is widely accepted. Bring small bills (~$150) for tips, tuk-tuks and markets.",
      "<strong>Weather right now:</strong> hot, occasional rain. Stay hydrated.",
      "<strong>Nearest airport:</strong> arrive into PNH (Phnom Penh). Depart from REP (Siem Reap) or KOS (Sihanoukville).",
    ]),
  },
};

const DEFAULT_DETAILS: TripFinalDetails = {
  whatsappUrl: "https://wa.me/00000000000",
  finalDetailsHtml: block("Final details", [
    "Your local crew will meet you at the Mad Monkey hostel for arrival check-in.",
    "Pack light layers, swimwear, reef-safe sunscreen, sturdy shoes, and a rain shell.",
    "Bring some local currency for tips, optional add-ons and street food.",
  ]),
};

export function tripFinalDetails(slug: string | null | undefined): TripFinalDetails {
  if (!slug) return DEFAULT_DETAILS;
  return TRIP_DETAILS[slug.toLowerCase()] ?? DEFAULT_DETAILS;
}

export function tripCountryFromSlug(slug: string | null | undefined): string {
  if (!slug) return "your trip";
  const map: Record<string, string> = {
    vietnam: "Vietnam",
    indonesia: "Indonesia",
    cambodia: "Cambodia",
  };
  return map[slug.toLowerCase()] ?? slug;
}
