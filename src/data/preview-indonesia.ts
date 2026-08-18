// Content for the /preview-indonesia demo page, straight from the
// "ALL IN Trips Edits - Aug 2026" brief. Lives here rather than in the database
// so the demo can be built and reviewed before we commit to a schema (see
// Phase 5 of IMPLEMENTATION_PLAN_AUG2026.md).
import mtBatur from "@/assets/hl-mt-batur.jpg";
import nusaPenida from "@/assets/hl-nusa-penida.jpg";
import snorkeling from "@/assets/hl-snorkeling.jpg";
import surfCamp from "@/assets/hl-surf-camp.jpg";

export const SNAPSHOT = {
  tripCode: "IND",
  days: 12,
  from: "Uluwatu",
  to: "Kuta Lombok",
  countries: "Indonesia",
  blurb:
    "From cliffside views at Uluwatu to a sunrise hike up Mount Batur, this 12-day run through Indonesia delivers the perfect blend of island chaos and downtime. Snorkel with turtles off Nusa Penida, cruise around Gili T by bike, and wrap things up catching waves at surf camp in Lombok. Built for young travelers who want a solid crew, zero planning stress, and maximum time on the water.",
};

export const IS_THIS_FOR_ME = [
  { k: "Vibe", v: "High Energy & Social" },
  { k: "Age Range", v: "18 to thirtysomethings" },
  { k: "Group Size", v: "Max 20 / Solo Trip" },
  { k: "Physical Level", v: "Light to Moderate (some hangovers, some hikes)" },
];

/** image: null renders a "photo pending" tile so the gap is visible, not hidden. */
export const HIGHLIGHTS: { title: string; image: string | null }[] = [
  { title: "Mt Batur Sunrise Trekking", image: mtBatur },
  { title: "Island Hopping around Nusa Penida", image: nusaPenida },
  { title: "Monkey See, Monkey Do Snorkeling Trip", image: snorkeling },
  { title: "Kuta Lombok Surf Camp", image: surfCamp },
  { title: "Mexican Family Dinner", image: null },
  { title: "Bucket List Bike Tour", image: null },
];

export const INCLUDED = [
  "12 days, 4 destinations",
  "All transfers + island boats",
  "24/7 local crew",
  "Free pre-night — arrive the night before and it's on us",
  "4 breakfasts, 5 lunches and 5 dinners",
  "Lots of free drinks included",
  "All activities included in the itinerary",
  "Dorm beds at Mad Monkey",
];

export const NOT_INCLUDED = [
  "Flights",
  "Travel insurance",
  "Additional food, drink + personal expenses",
  "Upgrades + optional add-ons",
];

export type Day = {
  label: string;
  place: string;
  body: string;
  transport?: string;
  activities?: string;
  meals?: string;
};

export const ITINERARY: Day[] = [
  {
    label: "Day 1", place: "Uluwatu",
    body: "Welcome to Bali! Touch down at Denpasar (DPS) Airport and make your way to Mad Monkey Uluwatu. Settle into your home base before meeting up with your crew for a Welcome Sunset session at Panorama Point. Toast to the start of an epic adventure, get to know your fellow travellers, and kick off the trip with a welcome drink.",
    activities: "Welcome Sunset session at Panorama Point",
    meals: "Welcome drink",
  },
  {
    label: "Day 2", place: "Uluwatu",
    body: "Rise and shine early, very early. Set off on an unforgettable Mt. Batur Sunrise Trek to catch the morning rays breaking over the clouds. After trekking back down, spend the rest of the day in full recovery mode. Hit the Mad Monkey wellness setup to recharge with the sauna, hot tub, and ice bath. Wrap up the evening with the group over a family dinner and drinks.",
    activities: "Mt. Batur Sunrise Trek, Mad Monkey Sauna, Hot Tub & Ice Bath access",
    meals: "Family Dinner (plus 2 free drinks)",
  },
  {
    label: "Day 3", place: "Uluwatu → Nusa Lembongan",
    body: "Say goodbye to Uluwatu as you catch a taxi to Sanur, followed by a fast 30-minute boat ride over to island paradise at Mad Monkey Nusa Lembongan. Once checked in, take advantage of top-tier hostel facilities: take a dip in the luxury pool, sweat it out in the gym or sauna, or test your grit with an ice bath session.",
    transport: "Taxi & fast boat to Nusa Lembongan",
    activities: "Access to Mad Monkey Lembongan pool, gym, sauna & ice baths",
  },
  {
    label: "Day 4", place: "Nusa Lembongan",
    body: "Head out early for the ultimate bucket-list moment: snorkeling alongside massive manta rays as they glide through the waters off Nusa Penida. Afterwards, head back to dry land for a completely relaxed afternoon, hit the beach, kick back by the pool, or claim a hammock. In the evening, regroup with the crew back at the hostel for a family dinner and a few drinks.",
    activities: "Manta Ray Snorkeling Experience, Family Dinner",
  },
  {
    label: "Day 5", place: "Nusa Lembongan & Nusa Penida",
    body: "Hop on a boat for a full day of island hopping around the stunning landscapes and dramatic cliffs of Nusa Penida (8:30 AM to 5:00 PM). After taking in the sights, head back to Mad Monkey to turn up the energy at the famous Mad Monkey Pool Party (6:00 PM to 10:00 PM).",
    activities: "Nusa Penida Island Hopping Day Trip, Mad Monkey Pool Party",
  },
  {
    label: "Day 6", place: "Nusa Lembongan → Gili Trawangan",
    body: "Catch an early fast boat over to the legendary, motorized-vehicle-free island of Gili Trawangan. Check into Mad Monkey Gili T and get your lay of the land. Tonight, join the family for a traditional Mexican dinner spread and drinks.",
    transport: "Fast boat to Gili Trawangan",
    meals: "Mexican Family Dinner (plus 2 free drinks)",
  },
  {
    label: "Day 7", place: "Gili Trawangan",
    body: "Hop on two wheels for the ultimate Gili T Bucket List Bike Tour to explore the best spots around the island. Afterwards, the party comes to you back at Mad Monkey. Get ready for an epic Foam Party featuring a live DJ set.",
    activities: "Gili T Bucket List Bike Tour, Mad Monkey Foam Party with live DJ",
  },
  {
    label: "Day 8", place: "Gili Trawangan",
    body: "Set sail for the iconic Mad Monkey Boat Party (2:00 PM to 6:00 PM). Dance, swim, and soak up the island vibes out on the water. Keep the high energy going into the night back at the hostel with an unlimited BBQ feast and drinks.",
    activities: "Mad Monkey Boat Party",
    meals: "Unlimited hostel BBQ & drinks",
  },
  {
    label: "Day 9", place: "Gili Trawangan → Kuta Lombok",
    body: "Dive into the crystal-clear waters on the \"Monkey See, Monkey Do\" Snorkeling Trip (10:30 AM to 4:00 PM) to spot tropical marine life. Afterwards, take a short boat transfer to mainland Lombok followed by a shuttle to Mad Monkey Kuta Lombok.",
    transport: "Boat & shuttle to Kuta Lombok",
    activities: "\"Monkey See, Monkey Do\" Snorkeling Trip",
  },
  {
    label: "Days 10–12", place: "Kuta Lombok Surf Camp",
    body: "Welcome to Surf Camp! Over the next three days, eat breakfast, then hit the waves around 9:00 to 10:00 AM. You'll head to different beaches each day depending on where the swell is best. Head back for lunch and a video analysis session with your instructors to review your form (and watch yourself wipe out in slow motion). Catch another afternoon surf session before diving into nightly events at the hostel. Rinse and repeat!",
    activities: "3-Day Surf Camp (daily surf sessions, video breakdown, beach transfers)",
    meals: "Daily breakfast, family dinner + 2 drinks per day",
  },
  {
    label: "Day 13", place: "Kuta Lombok",
    body: "Say farewell to your group of newfound friends as your Indonesian adventure comes to an end. Catch a quick 30-minute shuttle transfer to Lombok Airport (LOP) for your onward flight.",
    transport: "Departure shuttle to Lombok Airport (LOP)",
  },
];

export const REVIEWS = [
  {
    property: "Mad Monkey Uluwatu", author: "Sami Taysir", rating: 5, when: "a month ago",
    body: "My experience of this hostel was fantastic! I connected and made friends with so many people thanks to all the activities organised by the reps :) Facilities include sauna, jacuzzi and ice bath which is very impressive for a hostel too! I would 100% recommend this place to anyone looking for a balance between a chilled and party experience!",
  },
  {
    property: "Mad Monkey Nusa Lembongan", author: null, rating: 5, when: null,
    body: "It's a lovely hostel located up on the hill with a nice atmosphere and beautiful surroundings. What I enjoyed the most was the amazing community. The guests were friendly and fun, making it easy to meet new people, and the staff were incredibly welcoming and always happy to help. They serve the best cappuccino I've had on the island!",
  },
  {
    property: "Mad Monkey Gili Trawangan", author: null, rating: 5, when: null,
    body: "This was the best hostel I've ever stayed in, and it was all down to the staff. They made the experience so welcoming and fun. They got us involved in all activities, spent their days socialising and made real friendships. Lots of love to everyone there and we will definitely be back 💛",
  },
  {
    property: "Mad Monkey Kuta Lombok", author: "Andin Erdogan", rating: 5, when: "8 months ago",
    body: "I had an amazing experience at Mad Monkey Kuta, and Dayu played a huge part in making it unforgettable. She is incredibly friendly, attentive, and genuinely cares about making sure every guest feels welcome. Her energy and warm personality create such a positive atmosphere. Highly recommended!",
  },
];

export const FAQS = [
  { q: "What's included?", a: "12 days across 4 destinations, all transfers and island boats, 24/7 local crew, a free pre-trip night (arrive the night before and it's on us), 4 breakfasts, 5 lunches and 5 dinners, lots of free drinks, every activity in the itinerary, and dorm beds at Mad Monkey throughout." },
  { q: "What are the main highlights of this trip?", a: "Mt Batur sunrise trek, Panorama Point, the Manta Ray Snorkeling Experience, Nusa Penida island hopping, the Gili T Bucket List Bike Tour, the Monkey See Monkey Do snorkelling tour, and a 3-day surf camp." },
  { q: "What is the maximum and typical number of participants?", a: "Max 20, average 12." },
  { q: "What meals are included?", a: "4 breakfasts, 5 lunches and 5 dinners, plus lots of free drinks." },
  { q: "What are the modes of transportation?", a: "Private vehicle and boat." },
  { q: "Where will we stay during the trip?", a: "Every stay is in a Mad Monkey property: Uluwatu, Nusa Lembongan, Gili Trawangan and Kuta Lombok." },
  { q: "What happens after I pay my deposit?", a: "You get an email with your booking reference. Once 5 travellers have booked, your trip is confirmed and we'll email you the green light to book your flights. The remaining balance is then automatically charged to the same card 7 days before departure, no action needed." },
  { q: "What if my departure doesn't reach the minimum?", a: "Every group departure needs at least 5 travellers to run. If it hasn't reached 5 by 30 days before departure, we cancel it and refund your deposit in full, automatically. Solo bookings are exempt and are guaranteed to run." },
  { q: "What if my plans change?", a: "Plans change, and that's totally okay. Swap your trip dates, gift it to someone, or save it for later with our Lifetime Deposit Guarantee." },
  { q: "What are the visa and entry requirements?", a: "All countries require a valid passport with a minimum 6 months validity. If your nationality requires a visa for Indonesia, you can apply for a C1 tourist visa online via the Indonesian eVisa website. It's valid for 60 days from arrival and can be extended once for another 60. Visa information is correct at the time of writing and you are responsible for checking current rules for your country of birth." },
  { q: "What should I know about currency and cards?", a: "The local currency is the Indonesian Rupiah. The best way to carry money is a debit card, withdrawing local cash from ATMs. Travel with both a Visa and a Mastercard in case of a problem with one. USD, EUR, GBP, CAD and AUD cash is useful for when ATMs aren't accessible." },
  { q: "What emergency funds do I need?", a: "Access to $200 USD equivalent or more." },
  { q: "What are the tipping guidelines?", a: "It is customary in Asia to tip service providers such as waiters at approximately 10%, depending on service. Tipping is expected though not compulsory. For drivers and local guides, $2 to $4 USD per person per day is a reasonable range." },
  { q: "What activities are optional on this trip?", a: "None. Everything listed is already included in the cost of the trip." },
  { q: "What are the mandatory group rules?", a: "Illegal drugs will not be tolerated on any trip. Possessing or using drugs contravenes local law and puts the rest of the group at risk. Our philosophy of travel is one of respect towards everyone we encounter, and our team has the right to remove any member of the group who breaks this." },
  { q: "What are the age restrictions?", a: "Minimum age of 18." },
  { q: "Are international flights included?", a: "No, international flights are not included. Check-in times and baggage allowances vary by airline and can change, so we recommend checking in online in advance." },
  { q: "Who will be leading the group?", a: "You and your crew. These trips are designed to be squad-led and are easy to follow. If your group has a Squad Leader they'll take the reins, otherwise it's self-guided by the group. You're never truly on your own though, our on-the-ground teams are on standby at every location for a hand, a tip or a local recommendation." },
  { q: "Who do I contact for arrival issues or an emergency?", a: "Contact our Customer Service Team through the live chat on our website or at cs@madmonkeyhostels.com. You can also reach any property directly, and the numbers on our Google Maps listings are all up to date, including WhatsApp." },
  { q: "Is there a disclaimer I should read before booking?", a: "The information in this trip document has been compiled with care and is provided in good faith, but it is subject to change and does not form part of the contract between client and operator. All activities, experiences and itinerary details are subject to availability and may be changed, substituted or cancelled due to weather, safety, local operating conditions or other circumstances outside our reasonable control. Where changes are necessary we will make reasonable efforts to provide a suitable alternative of a similar nature and value." },
];
