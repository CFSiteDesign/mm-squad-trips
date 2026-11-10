// Koh Rong post-festival package (brief "Koh Sdach Collective Festival - Post
// Festival Package", 9 Nov 2026). Five nights on Koh Rong straight after The
// Collective on Koh Sdach, sold through the normal ALL IN checkout, emails and
// admin. The trip row is `cambodia-post-festival` (migration 20261110090000):
// one departure, 16 Dec 2026, no weekly dates. The slug starts "cambodia-"
// because the emails, Klaviyo and the team CCs take the country from the
// slug's first word; the page lives at /koh-rong-post-festival (the slug's own
// path also opens it, for Stripe's cancel link and admin booking links).
//
// Copy is the brief's; the day plan and inclusions are the itinerary sheet's
// (KOH RONG (POST-FESTIVAL).xlsx). Nothing here was written for it.
import heroBeach from "@/assets/koh-rong-package/hero-beach.jpg";
import fireShow from "@/assets/koh-rong-package/fire-show.jpg";
import boat1 from "@/assets/koh-rong-package/boat-party-1.jpg";
import boat2 from "@/assets/koh-rong-package/boat-party-2.jpg";
import boat3 from "@/assets/koh-rong-package/boat-party-3.jpg";
import boat4 from "@/assets/koh-rong-package/boat-party-4.jpg";

export const PACKAGE_SLUG = "cambodia-post-festival";
export const PACKAGE_PATH = "/koh-rong-post-festival";

export const PACKAGE = {
  eyebrow: "EXCLUSIVE POST-FESTIVAL PACKAGE",
  name: "Koh Rong Post-Festival Package",
  when: "16–21 December | 5 nights | Koh Rong",
  startDate: "2026-12-16",
  nights: 5,
  /** Fallback only: the live price comes from the trip row. */
  price: 232,
  urgency:
    "With the island expected to fill up fast after the festival, don't leave your plans to chance. Secure your bed, skip the planning and save over $50 when you book it all together.",
  pitch:
    "Keep the good times going with five more nights on Koh Rong, including accommodation at Mad Monkey, daily breakfast, an all you can drink package on your first night, tickets to the Koh Rong Boat Party and Nestival, and plenty more good times on the island.",
  cta: "EXPLORE THE PACKAGE",
  hero: heroBeach,
  photos: [
    { src: boat1, alt: "Koh Rong Boat Party" },
    { src: fireShow, alt: "Fire show on the beach" },
    { src: boat2, alt: "Koh Rong Boat Party" },
    { src: boat3, alt: "Koh Rong Boat Party" },
    { src: boat4, alt: "Koh Rong Boat Party" },
  ],
  included: [
    "Transfer from Koh Sdach to Koh Rong",
    "5 nights at Mad Monkey Koh Rong (12-bed dorm)",
    "Breakfast every day",
    "2 hours of free-flow beer, spirits and cocktails on your first night",
    "Koh Rong Boat Party ticket, with $10 bar credit",
    "Nestival ticket",
  ],
  itinerary: [
    { day: 1, date: "Wed 16 Dec", title: "Arrive on Koh Rong", body: "Transfer over from Koh Sdach, meet up, then 2 hours of free flow and the hostel's social activities." },
    { day: 2, date: "Thu 17 Dec", title: "Beach day", body: "Breakfast, then a free day to chill at the beach." },
    { day: 3, date: "Fri 18 Dec", title: "Boat party", body: "Breakfast, then the Koh Rong Boat Party, with $10 of bar credit." },
    { day: 4, date: "Sat 19 Dec", title: "Nestival", body: "Breakfast, then Nestival." },
    { day: 5, date: "Sun 20 Dec", title: "Relax and refresh", body: "Breakfast, then a day to relax and refresh." },
    { day: 6, date: "Mon 21 Dec", title: "Check out", body: "Check out of Mad Monkey Koh Rong." },
  ],
} as const;

/** The festival banner above the package. The brief has it as Collective's own
 *  artwork (festival name, dates, headliners) linking to their ticket page.
 *  Neither has been supplied yet; the banner stays hidden until both are set. */
export const FESTIVAL_BANNER: { image: string; ticketUrl: string; alt: string } = {
  image: "",
  ticketUrl: "",
  alt: "The Collective, Koh Sdach",
};
