// Koh Rong Ultimate Party Package. Started as the Koh Rong post-festival
// package (brief 9 Nov 2026: one week after The Collective on Koh Sdach);
// brief "Changing Post Festival Package to Koh Rong Party Package" (27 Nov
// 2026) made it weekly: every Wednesday, December to March, $220, and nothing
// about the festival or December dates. Same day the brief owner asked for
// April too (rainy season comes later) and for the boat-party photo in place
// of the beach one as the main picture.
//
// Sold through the normal ALL IN checkout, emails and admin. The trip row is
// still `cambodia-post-festival` (migrations 20261110090000 + 20261127090000):
// the emails, Klaviyo and the team CCs take the country from the slug's first
// word, and the slug never reaches guests. The page lives at
// /koh-rong-party-package; the old /koh-rong-post-festival and the slug's own
// path (Stripe's cancel link, admin booking links) open it too.
//
// Copy is the brief's; the day plan is the itinerary sheet's (KOH RONG
// ULTIMATE PARTY PACKAGE.xlsx). Nothing here was written for it.
import heroBoatParty from "@/assets/koh-rong-package/hero-boat-party.jpg";
import fireShow from "@/assets/koh-rong-package/fire-show.jpg";
import boat1 from "@/assets/koh-rong-package/boat-party-1.jpg";
import boat2 from "@/assets/koh-rong-package/boat-party-2.jpg";
import boat3 from "@/assets/koh-rong-package/boat-party-3.jpg";
import boat4 from "@/assets/koh-rong-package/boat-party-4.jpg";

export const PACKAGE_SLUG = "cambodia-post-festival";
export const PACKAGE_PATH = "/koh-rong-party-package";

export const PACKAGE = {
  name: "Koh Rong Ultimate Party Package",
  when: "December - April | 5 nights | Koh Rong, Cambodia",
  /** Every departure is a Wednesday. */
  startDay: "Wednesday",
  nights: 5,
  /** Fallback only: the live price comes from the trip row. */
  price: 220,
  intro:
    "Not only is Koh Rong in Cambodia home to one of the world's most beautiful beaches, it's THE place to be for this season's parties. The island fills up fast, especially over weekends, so don't leave your plans to chance. Secure your bed, skip the planning, and save $$$ when you book it all together.",
  pitch:
    "Keep the good times going with five more nights on Koh Rong, including accommodation at Mad Monkey, daily breakfast, an all you can drink package on your first night, tickets to the Koh Rong Boat Party, Nestival, Soundgarden and plenty more good times on the island.",
  cta: "EXPLORE THE PACKAGE",
  hero: heroBoatParty,
  photos: [
    { src: boat1, alt: "Koh Rong Boat Party" },
    { src: fireShow, alt: "Fire show on the beach" },
    { src: boat2, alt: "Koh Rong Boat Party" },
    { src: boat3, alt: "Koh Rong Boat Party" },
    { src: boat4, alt: "Koh Rong Boat Party" },
  ],
  included: [
    "5 nights at Mad Monkey Koh Rong (12-bed dorm)",
    "Breakfast every day",
    "A free drink every night at the Meet Up",
    "2 hours of free-flow beer, spirits and cocktails on your first night",
    "Koh Rong Boat Party ticket, with $10 bar credit",
    "Nestival ticket",
    "Soundgarden ticket",
  ],
  itinerary: [
    {
      day: 1, weekday: "Wed", title: "Welcome to Koh Rong!",
      body: "Arrive in Koh Rong, join the Mad Monkey Meet Up to meet other travellers from all over the world and enjoy a welcome cocktail on us. Keep the night going with 2 hours of unlimited beer, spirit mixers and cocktails and find your crew by joining our hostel social activities.",
    },
    {
      day: 2, weekday: "Thu", title: "Beach day",
      body: "After breakfast, spend the day soaking up the vibes on the white sand beaches of Koh Rong. Not the sunbathing type? There's plenty of adventure to be had! Rent a scooter and explore the island, zip around on jet skis or try snorkelling, kayaking or paddleboarding in the crystal clear sea. Heads up: all activities can be booked in house with the Mad Monkey team, but they're not included in the price of this package.",
    },
    {
      day: 3, weekday: "Fri", title: "Koh Rong Boat Party",
      body: "Start the day right with a delicious beachside breakfast; fuel for a big day ahead. Your package includes a pre-party at Treehouse, Koh Rong Boat Party tickets with $10 complimentary bar credit, and access to the after party at Soundgarden. What to expect from the boat party? A 350 person party across 3 dancefloors, a slide right off the deck into the sea, stops for sea jumps and swimming and live DJs playing as the sun sets.",
    },
    {
      day: 4, weekday: "Sat", title: "Nestival",
      body: "Today you'll head to Nestival, Cambodia's biggest weekly beach party. Your package includes Nestival entry. Doors open at midday, with free-flow beer from 1-3pm and beach games and team challenges running through the afternoon. When the sun sets, DJs take over the beachfront stages with disco, house, techno and drum and bass, alongside fire shows and live performers. The party goes until 6am.",
    },
    {
      day: 5, weekday: "Sun", title: "Relax and Reset",
      body: "Swap memories from the last couple of days over your final beachside brekkie, with strangers who have already turned into best mates. Sore head? We've heard that a Mad Monkey brunch and half an hour floating in the Koh Rong sea will sort you right out! Spend one last day taking in the epic views, and by the time the sun's setting you'll be ready to join in with the evening's events and do it all again! Where to next? We've heard a little island called Koh Sdach, just 40 minutes away by speedboat, is the perfect place to recharge...",
    },
    { day: 6, weekday: "Mon", title: "Check out", body: "Check out of Mad Monkey Koh Rong." },
  ],
} as const;
