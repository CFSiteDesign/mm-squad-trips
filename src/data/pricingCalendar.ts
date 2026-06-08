// Local pricing calendar — mirrors the Airtable "Pricing Calendar" table.
// Edit this when seasonal prices change. Keys are slug + "YYYY-MM".

type SlugPricing = Record<string, { price: number; strikethrough?: number }>;

const PRICING: Record<string, SlugPricing> = {
  indonesia: {
    "2026-06": { price: 700, strikethrough: 1140 },
    "2026-07": { price: 750, strikethrough: 1140 },
    "2026-08": { price: 750, strikethrough: 1140 },
    "2026-09": { price: 700, strikethrough: 1140 },
    "2026-10": { price: 650, strikethrough: 1140 },
    "2026-11": { price: 650, strikethrough: 1140 },
    "2026-12": { price: 750, strikethrough: 1140 },
  },
  cambodia: {
    "2026-06": { price: 650, strikethrough: 1050 },
    "2026-07": { price: 700, strikethrough: 1050 },
    "2026-08": { price: 700, strikethrough: 1050 },
    "2026-09": { price: 650, strikethrough: 1050 },
    "2026-10": { price: 600, strikethrough: 1050 },
    "2026-11": { price: 600, strikethrough: 1050 },
    "2026-12": { price: 700, strikethrough: 1050 },
  },
  vietnam: {
    "2026-06": { price: 750, strikethrough: 1200 },
    "2026-07": { price: 800, strikethrough: 1200 },
    "2026-08": { price: 800, strikethrough: 1200 },
    "2026-09": { price: 750, strikethrough: 1200 },
    "2026-10": { price: 700, strikethrough: 1200 },
    "2026-11": { price: 700, strikethrough: 1200 },
    "2026-12": { price: 800, strikethrough: 1200 },
  },
};

export function getLocalPrice(slug: string, isoDate: string): { price: number; strikethrough: number | null } | null {
  const month = isoDate.slice(0, 7);
  const row = PRICING[slug]?.[month];
  if (!row) return null;
  return { price: row.price, strikethrough: row.strikethrough ?? null };
}
