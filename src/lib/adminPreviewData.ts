// Fake data used ONLY by /adminpreview so the layout can be reviewed without a login.
// Nothing here touches the real database.
import type { AdminTable } from "@/lib/admin";
import type { SquadAdminData } from "@/lib/squad";

const TRIP_IDS = {
  vietnam: "11111111-1111-4111-8111-111111111111",
  vietnam7: "11111111-1111-4111-8111-111111111112",
  indonesia: "11111111-1111-4111-8111-111111111113",
  indonesia7: "11111111-1111-4111-8111-111111111114",
  cambodia: "11111111-1111-4111-8111-111111111115",
};

const DEP_IDS = {
  v1: "22222222-2222-4222-8222-222222222221",
  v2: "22222222-2222-4222-8222-222222222222",
  i1: "22222222-2222-4222-8222-222222222223",
  i2: "22222222-2222-4222-8222-222222222224",
  c1: "22222222-2222-4222-8222-222222222225",
};

const DISCOUNT_IDS = {
  early: "33333333-3333-4333-8333-333333333331",
  creator: "33333333-3333-4333-8333-333333333332",
};

function iso(daysFromNow: number) {
  return new Date(Date.now() + daysFromNow * 86400000).toISOString();
}
function day(daysFromNow: number) {
  return iso(daysFromNow).slice(0, 10);
}

const trips = [
  { id: TRIP_IDS.vietnam, code: "VIE", name: "ALL IN Vietnam", slug: "vietnam", days: 14, activity_count: 22, default_price: 850, default_strikethrough: 1150, active: true, start_weekday: 3, stops: [], testimonials: [], created_at: iso(-210), updated_at: iso(-6) },
  { id: TRIP_IDS.vietnam7, code: "VIE7", name: "ALL IN Vietnam 7 Day", slug: "vietnam-7", days: 7, activity_count: 12, default_price: 495, default_strikethrough: 650, active: true, start_weekday: 3, stops: [], testimonials: [], created_at: iso(-120), updated_at: iso(-6) },
  { id: TRIP_IDS.indonesia, code: "IND", name: "ALL IN Indonesia", slug: "indonesia", days: 13, activity_count: 20, default_price: 799, default_strikethrough: 1050, active: true, start_weekday: 1, stops: [], testimonials: [], created_at: iso(-210), updated_at: iso(-9) },
  { id: TRIP_IDS.indonesia7, code: "IND7", name: "ALL IN Indonesia 7 Day", slug: "indonesia-7", days: 7, activity_count: 11, default_price: 465, default_strikethrough: 620, active: true, start_weekday: 1, stops: [], testimonials: [], created_at: iso(-120), updated_at: iso(-9) },
  { id: TRIP_IDS.cambodia, code: "KHM", name: "ALL IN Cambodia", slug: "cambodia", days: 12, activity_count: 18, default_price: 749, default_strikethrough: 990, active: true, start_weekday: 1, stops: [], testimonials: [], created_at: iso(-200), updated_at: iso(-20) },
];

const departures = [
  { id: DEP_IDS.v1, trip_id: TRIP_IDS.vietnam, departure_code: "VIE-0926", departure_date: day(26), total_spots: 20, spots_remaining: 12, bookable: true, status: "confirmed", confirmed_at: iso(-3), min_bookings_to_confirm: 5, visibility: "public", owner_code: null, force_bookable: false, cancelled_at: null, created_at: iso(-90), updated_at: iso(-3) },
  { id: DEP_IDS.v2, trip_id: TRIP_IDS.vietnam, departure_code: "VIE-1024", departure_date: day(58), total_spots: 20, spots_remaining: 18, bookable: true, status: "pending", confirmed_at: null, min_bookings_to_confirm: 5, visibility: "public", owner_code: null, force_bookable: false, cancelled_at: null, created_at: iso(-90), updated_at: iso(-11) },
  { id: DEP_IDS.i1, trip_id: TRIP_IDS.indonesia, departure_code: "IND-0921", departure_date: day(21), total_spots: 20, spots_remaining: 6, bookable: true, status: "confirmed", confirmed_at: iso(-14), min_bookings_to_confirm: 5, visibility: "public", owner_code: null, force_bookable: false, cancelled_at: null, created_at: iso(-90), updated_at: iso(-2) },
  { id: DEP_IDS.i2, trip_id: TRIP_IDS.indonesia7, departure_code: "IND7-1019", departure_date: day(53), total_spots: 16, spots_remaining: 15, bookable: true, status: "pending", confirmed_at: null, min_bookings_to_confirm: 5, visibility: "public", owner_code: null, force_bookable: false, cancelled_at: null, created_at: iso(-60), updated_at: iso(-8) },
  { id: DEP_IDS.c1, trip_id: TRIP_IDS.cambodia, departure_code: "KHM-1102", departure_date: day(67), total_spots: 20, spots_remaining: 20, bookable: true, status: "pending", confirmed_at: null, min_bookings_to_confirm: 5, visibility: "private", owner_code: "DEMO01", force_bookable: true, cancelled_at: null, created_at: iso(-30), updated_at: iso(-30) },
];

const pricing_calendar = [
  { id: "44444444-4444-4444-8444-444444444441", trip_id: TRIP_IDS.vietnam, month: "September", price: 850, strikethrough: 1150, active: true, created_at: iso(-100), updated_at: iso(-10) },
  { id: "44444444-4444-4444-8444-444444444442", trip_id: TRIP_IDS.vietnam, month: "October", price: 875, strikethrough: 1150, active: true, created_at: iso(-100), updated_at: iso(-10) },
  { id: "44444444-4444-4444-8444-444444444443", trip_id: TRIP_IDS.indonesia, month: "September", price: 799, strikethrough: 1050, active: true, created_at: iso(-100), updated_at: iso(-10) },
  { id: "44444444-4444-4444-8444-444444444444", trip_id: TRIP_IDS.indonesia7, month: "October", price: 465, strikethrough: 620, active: true, created_at: iso(-100), updated_at: iso(-10) },
];

const discount_codes = [
  { id: DISCOUNT_IDS.early, code: "EARLYBIRD100", discount_type: "fixed", discount_amount: 100, active: true, usage_limit: 50, used_count: 12, expiry_date: day(60), applicable_to: ["All"], applicable_months: null, is_creator: false, creator_name: null, creator_email: null, creator_ref: null, commission_7day: null, commission_12day: null, stackable: false, stack_percent: null, created_at: iso(-80), updated_at: iso(-5) },
  { id: DISCOUNT_IDS.creator, code: "DEMOCREATOR", discount_type: "percent", discount_amount: 10, active: true, usage_limit: null, used_count: 7, expiry_date: null, applicable_to: ["vietnam", "indonesia"], applicable_months: ["October", "November"], is_creator: true, creator_name: "Demo Creator", creator_email: "creator@example.com", creator_ref: "DEMO", commission_7day: 40, commission_12day: 70, stackable: true, stack_percent: 5, created_at: iso(-45), updated_at: iso(-4) },
];

const bookingNames = [
  ["Alex Morgan", "alex.morgan@example.com", "United Kingdom", 24],
  ["Sofia Rossi", "sofia.rossi@example.com", "Italy", 22],
  ["Liam O'Brien", "liam.obrien@example.com", "Ireland", 27],
  ["Mia Chen", "mia.chen@example.com", "Australia", 25],
  ["Noah Schmidt", "noah.schmidt@example.com", "Germany", 23],
  ["Ella Nguyen", "ella.nguyen@example.com", "Canada", 26],
  ["Jack Wilson", "jack.wilson@example.com", "United Kingdom", 21],
  ["Zoe Dubois", "zoe.dubois@example.com", "France", 28],
] as const;

const bookings = bookingNames.map(([name, email, country, age], i) => {
  const dep = [DEP_IDS.v1, DEP_IDS.i1, DEP_IDS.v2, DEP_IDS.i2][i % 4];
  const tripId = dep === DEP_IDS.v1 || dep === DEP_IDS.v2 ? TRIP_IDS.vietnam : dep === DEP_IDS.i1 ? TRIP_IDS.indonesia : TRIP_IDS.indonesia7;
  const groupSize = i % 3 === 0 ? 2 : 1;
  const price = tripId === TRIP_IDS.indonesia7 ? 465 : tripId === TRIP_IDS.indonesia ? 799 : 850;
  const isCreatorBooking = i === 1 || i === 5;
  const discount = isCreatorBooking ? 80 : i % 4 === 0 ? 100 : 0;
  const final = (price - discount) * groupSize;
  return {
    id: `55555555-5555-4555-8555-5555555555${(10 + i).toString()}`,
    booking_ref: `DEMO-${1000 + i}`,
    trip_id: tripId,
    departure_id: dep,
    booking_type: groupSize > 1 ? "Group" : "Solo",
    group_id: groupSize > 1 ? `GRP-${i}` : null,
    group_size: groupSize,
    spot_number: 1,
    lead_name: name,
    lead_email: email,
    lead_phone: "+44 7000 000000",
    lead_country: country,
    lead_age: age,
    lead_solo: groupSize === 1,
    lead_source: "Instagram",
    additional_travelers: groupSize > 1 ? [{ name: "Travel Buddy", age: age - 1 }] : null,
    group_members: groupSize > 1 ? [name, "Travel Buddy"] : [name],
    payment_type: "Deposit",
    original_price: price * groupSize,
    discount_code_id: isCreatorBooking ? DISCOUNT_IDS.creator : discount ? DISCOUNT_IDS.early : null,
    discount_amount: discount * groupSize,
    final_price: final,
    amount_paid: 99 * groupSize,
    balance_amount: final - 99 * groupSize,
    balance_due_date: day(14),
    balance_status: "scheduled",
    balance_attempts: 0,
    status: i === 7 ? "Cancelled" : "Confirmed",
    stripe_session_id: `cs_demo_${i}`,
    staff_recommendation: i % 2 === 0 ? ["Reden", "Adel", "Hayley"][i % 3] : null,
    utm_source: i % 2 ? "instagram" : "google",
    utm_medium: i % 2 ? "social" : "cpc",
    utm_campaign: "allin-launch",
    created_at: iso(-i - 1),
    updated_at: iso(-i - 1),
  };
});

const email_send_log = [
  { id: "66666666-6666-4666-8666-666666666661", template_name: "booking_confirmation", recipient_email: "alex.morgan@example.com", cc: "cs@madmonkeyhostels.com", subject: "You're ALL IN — Vietnam", status: "sent", provider_message_id: "demo-1", error_message: null, metadata: null, created_at: iso(-1) },
  { id: "66666666-6666-4666-8666-666666666662", template_name: "trip_confirmed", recipient_email: "sofia.rossi@example.com", cc: null, subject: "Your trip is CONFIRMED", status: "sent", provider_message_id: "demo-2", error_message: null, metadata: null, created_at: iso(-2) },
  { id: "66666666-6666-4666-8666-666666666663", template_name: "squad_created", recipient_email: "leader@example.com", cc: null, subject: "Your squad is live", status: "sent", provider_message_id: "demo-3", error_message: null, metadata: null, created_at: iso(-4) },
  { id: "66666666-6666-4666-8666-666666666664", template_name: "reminder_7d", recipient_email: "mia.chen@example.com", cc: null, subject: "7 days to go", status: "failed", provider_message_id: null, error_message: "Demo failure example", metadata: null, created_at: iso(-6) },
];

export const previewTables: Record<AdminTable, Record<string, unknown>[]> = {
  trips,
  departures,
  pricing_calendar,
  discount_codes,
  bookings,
  email_send_log,
};

export const previewSquadAdmin: SquadAdminData = {
  leaders: [
    {
      id: "77777777-7777-4777-8777-777777777771",
      name: "Demo Leader",
      email: "leader@example.com",
      phone: "+44 7000 111222",
      instagram: "@demoleader",
      code: "31907",
      preferredTripSlug: "vietnam",
      preferredMonth: "October",
      reason: "Bringing my whole travel group.",
      createdAt: iso(-30),
      accessToken: "demo-token-1",
      isStudent: false,
      status: "approved",
      university: null,
      society: null,
      count: 5,
      tier: "50% OFF",
      bookings: bookings.slice(0, 5).map((b) => ({
        id: b.id,
        squad_leader_id: "77777777-7777-4777-8777-777777777771",
        booker_name: b.lead_name,
        booker_email: b.lead_email,
        trip_slug: "vietnam",
        departure_date: day(26),
        created_at: b.created_at,
      })),
    },
    {
      id: "77777777-7777-4777-8777-777777777772",
      name: "Student Demo",
      email: "student@example.ac.uk",
      phone: "+44 7000 333444",
      instagram: "@studentdemo",
      code: "44821",
      preferredTripSlug: "indonesia",
      preferredMonth: "November",
      reason: "Society trip for 20 people.",
      createdAt: iso(-6),
      accessToken: "demo-token-2",
      isStudent: true,
      status: "pending",
      university: "University of Leeds",
      society: "Surf Society",
      count: 2,
      tier: "—",
      bookings: [],
    },
  ],
  stats: { totalLeaders: 2, totalBookings: 7, unlockedHalf: 1, unlockedFree: 0, pendingStudents: 1 },
};
