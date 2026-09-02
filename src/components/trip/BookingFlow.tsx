import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  formatDateLong,
  formatPrice,
  freeArrivalNightLine,
  paymentLine,
  spotBadge,
  visibleDepartures,
  closedDepartures,
} from "@/lib/trip-helpers";
import { SpotBadge } from "./SpotBadge";
import { DurationToggle } from "./DurationToggle";
import type { Trip, Departure } from "@/types/trip";
import { createCheckoutSession, validateDiscount, fetchTrip } from "@/lib/api";
import { gtmClearEcommerce, gtmPushEvent } from "@/utils/gtmTracker";
import { buildTripEcommerceItem, CONVERSION_TYPE_ALL_IN, markCheckoutEventOnce } from "@/utils/ecommerceDataLayer";
import { Sticker } from "@/components/brand/Sticker";
import { COUNTRIES } from "@/lib/countries";
import { useSiteVariant, squadPath } from "@/hooks/use-site-variant";
import { readGaClientId } from "@/lib/ga";

const SOURCES = ["TikTok", "Instagram", "Friend", "Other"] as const;

interface LeadFields {
  name: string; email: string; phone: string; phoneDial: string; country: string; age: string;
  solo: boolean; source: string; staffRec: string; friends: string;
}
interface TravelerFields { firstName: string; lastName: string; email: string; age: string; dietary: string; }

const emptyLead: LeadFields = {
  name: "", email: "", phone: "", phoneDial: "44", country: "", age: "", solo: false, source: "", staffRec: "", friends: "",
};
const emptyTraveler: TravelerFields = { firstName: "", lastName: "", email: "", age: "", dietary: "" };

/** Sentinel id for the not-yet-created custom departure. */
const CUSTOM_DEPARTURE_ID = "__custom__";
const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
/** Custom dates must start at least 5 days out (client decision, 28 Jul 2026). */
const MIN_CUSTOM_DATE_NOTICE_DAYS = 5;

/** Next date on `weekday` that is at least `minNoticeDays` away (ISO, UTC). */
function firstAllowedCustomDate(weekday: number, minNoticeDays: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + Math.max(1, minNoticeDays));
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function BookingFlow({ trip, hideHeading = false }: { trip: Trip; hideHeading?: boolean }) {
  const variant = useSiteVariant();
  const isStudent = variant === "student";
  const showDurationToggle = ["indonesia", "vietnam", "indonesia-7", "vietnam-7"].includes(trip.slug);
  const [groupSize, setGroupSize] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lead, setLead] = useState<LeadFields>(emptyLead);
  const [travelers, setTravelers] = useState<TravelerFields[]>([]);
  const [discountCode, setDiscountCode] = useState("");
  const [secondCode, setSecondCode] = useState("");
  const [firstStackable, setFirstStackable] = useState(false);
  const [discountState, setDiscountState] = useState<{ valid: boolean; msg: string; amount?: number; kind?: string } | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [joinMode, setJoinMode] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const oneClickApplied = useRef(false);

  // Private departures owned by an entered squad code — invisible to the public,
  // revealed to anyone holding the code so a leader's crew can book their date.
  const [revealedDepartures, setRevealedDepartures] = useState<Departure[]>([]);
  const allDepartures = useMemo(() => {
    if (revealedDepartures.length === 0) return trip.departures;
    const known = new Set(trip.departures.map((d) => d.id));
    return [...trip.departures, ...revealedDepartures.filter((d) => !known.has(d.id))]
      .sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [trip.departures, revealedDepartures]);

  const visible = useMemo(() => visibleDepartures(allDepartures, groupSize, trip.slug), [allDepartures, groupSize, trip.slug]);
  const closed = useMemo(() => closedDepartures(allDepartures, trip.slug), [allDepartures, trip.slug]);

  // Custom departure date (squad leaders + solo). Held client-side until payment,
  // then materialised as a private departure by the webhook.
  const [customDate, setCustomDate] = useState("");
  const customDeparture = useMemo<Departure | null>(() => {
    if (!customDate) return null;
    return {
      id: CUSTOM_DEPARTURE_ID,
      departureId: `${trip.code}-${customDate}`,
      date: customDate,
      spotsRemaining: 20,
      bookable: true,
      price: trip.defaultPrice,
      strikethrough: trip.defaultStrikethrough || null,
      isPrivate: true,
    };
  }, [customDate, trip.code, trip.defaultPrice, trip.defaultStrikethrough]);

  const selected = selectedId === CUSTOM_DEPARTURE_ID
    ? customDeparture
    : visible.find((d) => d.id === selectedId) ?? null;

  // One-click booking links (generated in admin):
  //   /{slug}?date=YYYY-MM-DD&spots=2&code=XYZ#booking
  // Only ever preselects a departure that is already listed — a URL can't
  // conjure a custom date, that stays gated to squad leaders and solo.
  useEffect(() => {
    if (oneClickApplied.current) return;
    const params = new URLSearchParams(window.location.search);
    const qDate = params.get("date");
    const qSpots = Number(params.get("spots") || "0");
    const qCode = params.get("code");
    if (!qDate && !qSpots && !qCode) return;
    if (trip.departures.length === 0) return; // wait for trip data
    oneClickApplied.current = true;

    if (qSpots >= 1 && qSpots <= 5) changeGroup(qSpots);
    if (qCode) setDiscountCode(qCode.toUpperCase());
    if (qDate) {
      const match = trip.departures.find((d) => d.date === qDate);
      if (match) {
        setSelectedId(match.id);
        // Retry the jump: the page is still loading hero/itinerary images, so a
        // single scroll lands in the wrong place (or is undone by ScrollToTop).
        let tries = 0;
        const jump = window.setInterval(() => {
          const el = document.getElementById("booking");
          tries += 1;
          if (el) {
            const top = el.getBoundingClientRect().top;
            if (Math.abs(top) < 120) { window.clearInterval(jump); return; }
            window.scrollTo({ top: top + window.scrollY - 8, behavior: tries === 1 ? "smooth" : "auto" });
          }
          if (tries >= 12) window.clearInterval(jump);
        }, 300);
      } else {
        toast.error("That departure date isn't available any more — pick another below.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.departures]);

  const startWeekday = typeof trip.startWeekday === "number" ? trip.startWeekday : null;

  // A recognised squad code unlocks that squad's private dates.
  useEffect(() => {
    const code = discountCode.trim().toUpperCase();
    if (!code || discountState?.kind !== "squad") {
      setRevealedDepartures([]);
      return;
    }
    let cancelled = false;
    fetchTrip(trip.slug, code)
      .then((t) => { if (!cancelled) setRevealedDepartures((t.departures ?? []).filter((d) => d.isPrivate)); })
      .catch(() => { /* reveal is best-effort — public dates still work */ });
    return () => { cancelled = true; };
  }, [discountCode, discountState?.kind, trip.slug]);

  function changeGroup(n: number) {
    setGroupSize(n);
    setSelectedId(null);
    setLead({ ...emptyLead, solo: false });
    setTravelers(Array.from({ length: Math.max(0, n - 1) }, () => ({ ...emptyTraveler })));
  }

  const soloSelected = groupSize === 1 && lead.solo;

  // Only a squad leader (identified by their squad code) or a solo traveller may
  // create a custom date — plain group bookings pick from the listed departures.
  // NOTE: must stay below soloSelected — it reads it at render time.
  const isSquadCodeEntered = discountState?.valid === true && discountState.kind === "squad";
  const showCustomDate = (soloSelected || isSquadCodeEntered) && startWeekday !== null;

  function selectSolo() {
    setGroupSize(1);
    setSelectedId(null);
    setLead({ ...emptyLead, solo: true });
    setTravelers([]);
    setJoinMode(false);
  }

  const validatedFor = useRef<{ depId: string; code: string; code2: string } | null>(null);

  useEffect(() => {
    const code = discountCode.trim().toUpperCase();
    const code2 = secondCode.trim().toUpperCase();
    // Validate before a date is picked too — a squad leader needs their code
    // recognised for the custom-date box to appear, which is exactly when no
    // listed departure suits them. Re-validates once they choose a date.
    if (!code || discountLoading) return;
    const depKey = selected?.id ?? "none";
    if (
      validatedFor.current?.depId === depKey &&
      validatedFor.current?.code === code &&
      validatedFor.current?.code2 === code2
    ) return;

    setDiscountLoading(true);
    validatedFor.current = { depId: depKey, code, code2 };
    setDiscountState(null);

    const subtotal = (selected?.price ?? trip.defaultPrice) * groupSize;
    validateDiscount({ code, secondCode: code2 || undefined, tripSlug: trip.slug, amount: subtotal, departureDate: selected?.date })
      .then((result) => {
        setFirstStackable(result.stackable === true || !!code2);
        if (result.valid && result.kind === "squad") {
          setDiscountState({ valid: true, msg: "Squad code applied ✓", amount: 0, kind: "squad" });
        } else if (result.valid && result.isCreator) {
          // A creator code may ALSO carry a discount (e.g. DUTCHIES10 = $100 off
          // + prize draw), so never hardcode 0 here — show what the server applied.
          const creatorOff = result.discountAmount ?? 0;
          setDiscountState({
            valid: true,
            msg: creatorOff > 0
              ? `Creator code applied — ${formatPrice(creatorOff)} off, you're in the prize draw, and your 2 free nights will be added to your Mad Monkey Loyalty account shortly 🎉`
              : "Creator code applied — you're in the prize draw, and your 2 free nights will be added to your Mad Monkey Loyalty account shortly 🎉",
            amount: creatorOff,
          });
        } else if (result.valid && result.stackFixed != null && result.stackPercent != null) {
          // Stacked codes: messaging is fixed-first, then % (matches the maths).
          setDiscountState({
            valid: true,
            msg: `Applied — ${formatPrice(result.stackFixed)} off, then ${result.stackPercent}% off the rest: ${formatPrice(result.discountAmount ?? 0)} total${result.capped ? " (max discount reached)" : ""}`,
            amount: result.discountAmount,
          });
        } else if (result.valid) {
          setDiscountState({ valid: true, msg: `Applied — ${formatPrice(result.discountAmount ?? 0)} off${result.capped ? " (max discount reached)" : ""}`, amount: result.discountAmount });
        } else {
          setDiscountState({ valid: false, msg: result.reason || "Code does not exist" });
        }
      })
      .finally(() => setDiscountLoading(false));
  }, [selected, discountCode, secondCode, discountLoading, groupSize, trip.slug, trip.defaultPrice]);

  async function submit() {
    if (!selected) return toast.error("Pick a departure first");
    if (!lead.name || !lead.email || !lead.phone || !lead.country) return toast.error("Fill out your details");
    setSubmitting(true);
    const discountAmount = discountState?.valid ? discountState.amount ?? 0 : 0;
    const checkoutDedupeKey = `${trip.slug}:${selected.id}:${groupSize}`;
    if (markCheckoutEventOnce("begin_checkout", checkoutDedupeKey)) {
      gtmClearEcommerce();
      gtmPushEvent("begin_checkout", {
        conversion_type: CONVERSION_TYPE_ALL_IN,
        ecommerce: {
          currency: "USD",
          value: selected.price * groupSize - discountAmount,
          coupon: discountState?.valid ? discountCode.trim().toUpperCase() : "",
          items: [
            buildTripEcommerceItem(trip, selected, {
              quantity: groupSize,
              coupon: discountState?.valid ? discountCode.trim().toUpperCase() : undefined,
              discount: discountAmount,
            }),
          ],
        },
      });
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const utm: Record<string, string> = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach((k) => {
        const v = params.get(k); if (v) utm[k] = v;
      });
      const fullPhone = `+${lead.phoneDial} ${lead.phone}`.trim();
      // create-checkout-session packs each traveler as name|email|phone|country|age.
      // The form stores firstName/lastName separately, so combine them into `name`
      // and pass dietary through — otherwise the traveller's name is dropped and
      // never reaches the Additional Travelers field in Airtable.
      const travelerPayload = travelers.map((t) => ({
        name: `${t.firstName ?? ""} ${t.lastName ?? ""}`.trim(),
        email: t.email,
        age: t.age,
        dietary: t.dietary,
      }));
      const { url } = await createCheckoutSession({
        tripSlug: trip.slug,
        // Custom dates have no departure row yet — the server validates the date
        // and the webhook creates it once payment succeeds.
        ...(selected.id === CUSTOM_DEPARTURE_ID
          ? { customDate: selected.date }
          : { departureId: selected.id }),
        groupSize,
        leadBooker: { ...lead, phone: fullPhone },
        travelers: travelerPayload,
        discountCode: discountState?.valid ? discountCode.trim().toUpperCase() : undefined,
        secondDiscountCode: discountState?.valid && secondCode.trim() ? secondCode.trim().toUpperCase() : undefined,
        friendsMentioned: lead.friends,
        staffRecommendation: lead.staffRec.trim() || undefined,
        utm,
        gaClientId: readGaClientId(),
      });
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
      setSubmitting(false);
    }
  }

  return (
    <section id="booking" className="relative bg-mm-pink px-5 py-12 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-3xl space-y-8 md:max-w-5xl md:space-y-12">
        {showDurationToggle && (
          <div className="flex justify-center md:justify-start">
            <DurationToggle slug={trip.slug} />
          </div>
        )}
        {/* The Aug 2026 preview supplies its own "Dates & Availability" heading,
            so it opts out of this one. Defaults to false: live is unchanged. */}
        {!hideHeading && (
          <div>
            <Sticker color="yellow" rotate={-4}>STEP UP</Sticker>
            <h2 className="mt-4 font-display text-[2.5rem] leading-[0.92] text-mm-bone md:mt-6 md:text-7xl lg:text-8xl">
              BOOK<br />YOUR SPOT.
            </h2>
          </div>
        )}

        {/* Squad booking choice */}
        <div className="space-y-3">
          <p className="font-sticker text-sm tracking-[0.15em] text-mm-bone/80">BOOKING WITH A SQUAD?</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Link
              to={isStudent
                ? `${squadPath("register", variant)}?trip=${encodeURIComponent(trip.slug)}`
                : `/squad-leader/register?trip=${encodeURIComponent(trip.slug)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col border-[3px] border-mm-black bg-mm-paper p-4 text-left text-mm-black shadow-mm-sm transition hover:-translate-x-[2px] hover:-translate-y-[2px]"
            >
              <span className="font-display text-lg">START A SQUAD</span>
              <span className="mt-1 text-xs text-mm-black/70">
                {isStudent
                  ? "Groups of 10+ get 2 free organiser spots."
                  : "Lead your crew — 50% off at 4 bookings, free trip at 8."}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setJoinMode((v) => !v)}
              className={`flex flex-col border-[3px] p-4 text-left shadow-mm-sm transition ${
                joinMode ? "border-mm-black bg-mm-lime text-mm-black shadow-mm" : "border-mm-black bg-mm-paper text-mm-black hover:-translate-x-[2px] hover:-translate-y-[2px]"
              }`}
            >
              <span className="font-display text-lg">JOIN A SQUAD</span>
              <span className="mt-1 text-xs text-mm-black/70">
                {isStudent
                  ? "Have a squad code? Enter to join the group."
                  : "Have a squad code? Enter it for good vibes."}
              </span>
            </button>
          </div>
          {joinMode && (
            <div className="flex gap-3">
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="SQUAD CODE"
                className="h-12 flex-1 rounded-none border-[3px] border-mm-black bg-mm-paper text-mm-black uppercase font-display tracking-wide"
              />
              <Button
                type="button"
                onClick={() => { setDiscountCode(joinCode); setJoinMode(false); }}
                disabled={!joinCode.trim()}
                className="h-12 rounded-none border-[3px] border-mm-black bg-mm-orange font-display text-mm-black hover:bg-mm-orange shadow-mm-sm disabled:opacity-50"
              >
                SAVE & CONTINUE
              </Button>
            </div>
          )}
          {discountCode && !joinMode && (
            <p className="font-sticker text-[11px] tracking-[0.15em] text-mm-lime">
              SQUAD CODE ENTERED: {discountCode}
            </p>
          )}
        </div>

        {/* Travel solo — prominent, explicit opt-in (brief: "unique TRAVEL SOLO box") */}
        <div className="space-y-3">
          <p className="font-sticker text-sm tracking-[0.15em] text-mm-bone/80">OR TRAVEL SOLO — STRESS-FREE, DONE FOR YOU</p>
          <button
            type="button"
            onClick={selectSolo}
            className={`flex w-full flex-col border-[3px] p-4 text-left shadow-mm-sm transition ${
              soloSelected
                ? "border-mm-black bg-mm-lime text-mm-black shadow-mm"
                : "border-mm-black bg-mm-paper text-mm-black hover:-translate-x-[2px] hover:-translate-y-[2px]"
            }`}
          >
            <span className="font-display text-lg">TRAVEL SOLO 🧳</span>
            <span className="mt-1 text-xs text-mm-black/70">
              Just you — and it's <strong>guaranteed to run</strong>. No crew, no 5-person minimum. We plan the whole itinerary; you just show up, and you're cleared to book flights the moment you've paid.
            </span>
          </button>
          <p className="font-sticker text-[11px] tracking-[0.15em] text-mm-bone/70">
            BOOKING A FEW OF YOU WITHOUT A SQUAD? JUST PICK YOUR SPOTS BELOW.
          </p>
        </div>

        {/* Step 1: spots */}
        <FormStep n={1} label="HOW MANY SPOTS?">
          <Select value={String(groupSize)} onValueChange={(v) => changeGroup(Number(v))}>
            <SelectTrigger className="h-14 w-40 rounded-none border-[3px] border-mm-black bg-mm-paper text-mm-black font-display text-lg shadow-mm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[3px] border-mm-black bg-mm-paper">
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)} className="font-display">{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormStep>

        {/* Step 2: departure */}
        <FormStep n={2} label="PICK YOUR DEPARTURE">
          {visible.length === 0 && closed.length === 0 ? (
            <p className="mt-2 font-sticker text-xs tracking-[0.15em] text-mm-bone/80">
              NO DEPARTURES WITH {groupSize} SPOT{groupSize > 1 ? "S" : ""} RIGHT NOW.
            </p>
          ) : (
            <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-3 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0">
              {visible.map((d) => (
                <DepartureCard
                  key={d.id}
                  dep={d}
                  groupSize={groupSize}
                  selected={selectedId === d.id}
                  onSelect={() => setSelectedId(d.id)}
                />
              ))}
              {closed.map((d) => (
                <ClosedDepartureCard key={d.id} dep={d} />
              ))}
            </div>
          )}

          {/* Custom date — squad leaders (starting a new date for their crew) and
              solo travellers. Locked to the trip's start weekday. */}
          {showCustomDate && startWeekday !== null && (
            <div className="mt-4 border-[3px] border-mm-bone bg-mm-black/40 p-4">
              <p className="font-sticker text-[11px] tracking-[0.15em] text-mm-lime">
                ✳ CAN'T SEE YOUR DATE? PICK YOUR OWN
              </p>
              <p className="mt-1 text-[13px] leading-snug text-mm-bone/80">
                {isSquadCodeEntered && !soloSelected
                  ? `Start your squad on any ${WEEKDAY_NAMES[startWeekday]}. Only people with your squad code will see it.`
                  : `Depart any ${WEEKDAY_NAMES[startWeekday]} you like — solo trips are guaranteed to run.`}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <Input
                  type="date"
                  value={customDate}
                  min={firstAllowedCustomDate(startWeekday, MIN_CUSTOM_DATE_NOTICE_DAYS)}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) { setCustomDate(""); if (selectedId === CUSTOM_DEPARTURE_ID) setSelectedId(null); return; }
                    const picked = new Date(v + "T00:00:00Z");
                    if (picked.getUTCDay() !== startWeekday) {
                      toast.error(`${trip.name} departs on ${WEEKDAY_NAMES[startWeekday]}s — please pick a ${WEEKDAY_NAMES[startWeekday]}.`);
                      return;
                    }
                    setCustomDate(v);
                    setSelectedId(CUSTOM_DEPARTURE_ID);
                  }}
                  className="h-12 w-[190px] rounded-none border-[3px] border-mm-black bg-mm-paper font-display text-mm-black"
                />
                {customDate && selectedId === CUSTOM_DEPARTURE_ID && (
                  <span className="font-sticker text-[11px] tracking-[0.14em] text-mm-lime">
                    {formatDateLong(customDate).toUpperCase()} SELECTED ✓
                  </span>
                )}
              </div>
              <p className="mt-2 font-sticker text-[10px] tracking-[0.14em] text-mm-bone/50">
                {WEEKDAY_NAMES[startWeekday].toUpperCase()}S ONLY · {soloSelected ? "RUNS WHATEVER THE NUMBERS" : "NEEDS 5 TRAVELLERS TO RUN"}
              </p>
            </div>
          )}
        </FormStep>

        {selected && (
          <>
            <FormStep n={3} label="YOUR DETAILS">
              <div className="space-y-4">
                <LeadForm value={lead} onChange={setLead} groupSize={groupSize} />
                {travelers.map((t, i) => (
                  <TravelerForm
                    key={i}
                    index={i + 2}
                    value={t}
                    onChange={(v) => setTravelers((arr) => arr.map((x, j) => (j === i ? v : x)))}
                  />
                ))}
              </div>
            </FormStep>

            <FormStep n={4} label="DISCOUNT CODE (IF YOU HAVE ONE!)">
              <div className="space-y-2">
                <div className="flex gap-3">
                  <Input
                    value={discountCode}
                    onChange={(e) => {
                      setDiscountCode(e.target.value.toUpperCase());
                      setDiscountState(null);
                      validatedFor.current = null;
                    }}
                    placeholder="DISCOUNT CODE"
                    className="h-12 flex-1 rounded-none border-[3px] border-mm-black bg-mm-paper text-mm-black uppercase font-display tracking-wide"
                  />
                  {discountLoading && (
                    <span className="self-center font-sticker text-[11px] tracking-[0.15em] text-mm-bone/80">
                      CHECKING…
                    </span>
                  )}
                </div>
                {/* Second code — only for stackable codes (one fixed + one %). */}
                {(firstStackable || secondCode) && (
                  <div className="flex gap-3">
                    <Input
                      value={secondCode}
                      onChange={(e) => {
                        setSecondCode(e.target.value.toUpperCase());
                        setDiscountState(null);
                        validatedFor.current = null;
                      }}
                      placeholder="SECOND CODE (OPTIONAL)"
                      className="h-12 flex-1 rounded-none border-[3px] border-mm-black bg-mm-paper text-mm-black uppercase font-display tracking-wide"
                    />
                  </div>
                )}
                {discountState && (
                  <p
                    className={`font-sticker text-[11px] tracking-[0.15em] ${
                      discountState.valid ? "text-mm-lime" : "text-mm-bone/80"
                    }`}
                  >
                    {discountState.msg.toUpperCase()}
                  </p>
                )}
              </div>
            </FormStep>




            <div className="border-mm-thick bg-mm-paper p-4 text-mm-black shadow-mm-lg md:p-6">
              {/* Final confirmation + last-chance duration switch */}
              <div className="mb-4 border-[3px] border-mm-black bg-mm-black p-3 text-mm-bone md:mb-5 md:p-4">
                <p className="font-sticker text-[10px] tracking-[0.18em] text-mm-bone/60">YOU'RE ABOUT TO BOOK</p>
                <p className="mt-1 font-display text-lg leading-tight text-mm-bone md:text-xl">
                  {trip.name.toUpperCase()} · {trip.days} DAYS
                </p>
                <p className="mt-1 text-[13px] text-mm-bone/80">
                  {formatDateLong(selected.date)} · {groupSize} SPOT{groupSize > 1 ? "S" : ""} · from {formatPrice(selected.price)}
                </p>
                {showDurationToggle && (
                  <div className="mt-3">
                    <p className="mb-2 font-sticker text-[10px] tracking-[0.14em] text-mm-bone/50">
                      CHANGE THE LENGTH ONE LAST TIME?
                    </p>
                    <DurationToggle slug={trip.slug} />
                  </div>
                )}
              </div>
              <PaymentSummary trip={trip} selected={selected} groupSize={groupSize} discountAmount={discountState?.amount ?? 0} />
              <Button
                disabled={submitting}
                onClick={submit}
                size="lg"
                className="mt-5 h-14 w-full rounded-none border-[3px] border-mm-black bg-mm-orange font-display text-[15px] text-mm-black hover:bg-mm-orange shadow-mm transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px] md:mt-6 md:text-base"
              >
                {submitting ? "REDIRECTING…" : "CONTINUE TO PAYMENT →"}
              </Button>
              <p className="mt-3 text-center font-sticker text-[10px] tracking-[0.18em] text-mm-black/70">
                SECURE STRIPE CHECKOUT · SPOT HELD ON PAYMENT
              </p>
            </div>

          </>
        )}
      </div>
    </section>
  );
}

function FormStep({ n, label, children }: { n: number; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="inline-flex h-9 w-9 items-center justify-center border-[3px] border-mm-bone bg-mm-orange font-display text-base text-mm-black">
          {n}
        </span>
        <Label className="font-display text-sm tracking-[0.1em] text-mm-bone">{label}</Label>
      </div>
      {children}
    </div>
  );
}

function DepartureCard({
  dep, groupSize, selected, onSelect,
}: { dep: Departure; groupSize: number; selected: boolean; onSelect: () => void }) {
  const badge = spotBadge(dep.spotsRemaining);
  const pay = paymentLine(dep.date, groupSize, dep.price);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-[240px] shrink-0 snap-start flex-col border-[3px] p-4 text-left transition md:w-auto ${
        selected
          ? "border-mm-black bg-mm-lime text-mm-black shadow-mm"
          : "border-mm-black bg-mm-paper text-mm-black hover:-translate-x-[2px] hover:-translate-y-[2px] shadow-mm-sm"
      }`}
    >
      <span className="font-display text-lg">{formatDateLong(dep.date).toUpperCase()}</span>
      <SpotBadge badge={badge} className="mt-3 self-start" />
      <span className="mt-3 text-[11px] font-medium text-mm-black/70">{freeArrivalNightLine(dep.date)}</span>
      <span className="mt-2 font-sticker text-[11px] tracking-[0.12em] text-mm-black">{pay.label.toUpperCase()}</span>
    </button>
  );
}

export function ClosedDepartureCard({ dep }: { dep: Departure }) {
  return (
    <div className="flex w-[240px] shrink-0 snap-start flex-col border-[3px] border-mm-black/30 bg-mm-paper/60 p-4 text-left md:w-auto">
      <span className="font-display text-lg text-mm-black/60">{formatDateLong(dep.date).toUpperCase()}</span>
      <span className="mt-3 self-start font-sticker text-[11px] tracking-[0.12em] text-mm-black/50">
        BOOKING CLOSED
      </span>
      <span className="mt-3 text-[11px] font-medium text-mm-black/50">{freeArrivalNightLine(dep.date)}</span>
      <p className="mt-3 font-sticker text-[10px] tracking-[0.1em] text-mm-black/60 leading-relaxed">
        You've missed the deadline for securing your spot, please reach out to customer service and we will do our best to confirm your booking!{" "}
        <a href="mailto:cs@madmonkeyhostels.com" className="underline decoration-mm-black/40 hover:text-mm-black">
          cs@madmonkeyhostels.com
        </a>
      </p>
    </div>
  );
}

function LeadForm({
  value, onChange, groupSize,
}: { value: LeadFields; onChange: (v: LeadFields) => void; groupSize: number }) {
  const set = <K extends keyof LeadFields>(k: K, v: LeadFields[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3 border-mm-thick bg-mm-paper p-4 text-mm-black shadow-mm md:p-5">

      <h4 className="font-display text-sm tracking-wide">{groupSize > 1 ? "LEAD BOOKER (YOU)" : "YOUR DETAILS"}</h4>
      <Field label="Full name" v={value.name} onChange={(v) => set("name", v)} />
      <Field label="Email" type="email" v={value.email} onChange={(v) => set("email", v)} />
      <div>
        <Label className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/80">PHONE</Label>
        <div className="mt-1 flex gap-2">
          <Select value={value.phoneDial} onValueChange={(v) => set("phoneDial", v)}>
            <SelectTrigger className="h-11 w-28 shrink-0 rounded-none border-[3px] border-mm-black bg-mm-paper font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72 rounded-none border-[3px] border-mm-black">
              {COUNTRIES.filter((c) => c.dial).map((c) => (
                <SelectItem key={c.code} value={c.dial}>+{c.dial} {c.code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="tel"
            inputMode="tel"
            value={value.phone}
            onChange={(e) => set("phone", e.target.value)}
            className="h-11 rounded-none border-[3px] border-mm-black bg-mm-paper font-medium"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/80">COUNTRY</Label>
          <Select
            value={value.country}
            onValueChange={(v) => {
              const match = COUNTRIES.find((c) => c.name === v);
              onChange({ ...value, country: v, phoneDial: match?.dial || value.phoneDial });
            }}
          >
            <SelectTrigger className="mt-1 h-11 rounded-none border-[3px] border-mm-black bg-mm-paper font-medium">
              <SelectValue placeholder="Choose" />
            </SelectTrigger>
            <SelectContent className="max-h-72 rounded-none border-[3px] border-mm-black">
              {COUNTRIES.map((c) => (
                <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Field label="Age" type="number" v={value.age} onChange={(v) => set("age", v)} />
      </div>
      {groupSize === 1 && (
        <div className="flex items-center justify-between border-[3px] border-mm-black bg-mm-lime px-3 py-2">
          <Label htmlFor="solo" className="font-sticker text-[11px] tracking-[0.12em] text-mm-black">TRAVELLING SOLO?</Label>
          <Switch id="solo" checked={value.solo} onCheckedChange={(v) => set("solo", v)} />
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/80">WHERE DID YOU HEAR ABOUT US?</Label>
          <Select value={value.source} onValueChange={(v) => set("source", v)}>
            <SelectTrigger className="mt-1 h-11 rounded-none border-[3px] border-mm-black bg-mm-paper font-medium">
              <SelectValue placeholder="Choose one" />
            </SelectTrigger>
            <SelectContent className="rounded-none border-[3px] border-mm-black">
              {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/80">
            MAD MONKEY STAFF RECOMMENDATION? SHARE THEIR NAME <span className="text-mm-black/50">(OPTIONAL)</span>
          </Label>
          <Input
            value={value.staffRec}
            onChange={(e) => set("staffRec", e.target.value)}
            placeholder="Staff member's name"
            className="mt-1 h-11 rounded-none border-[3px] border-mm-black bg-mm-paper font-medium"
          />
        </div>
      </div>
      {groupSize === 1 && (
        <div>
          <Label className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/80">
            FRIENDS BOOKING SEPARATELY? ADD THEIR NAMES
          </Label>
          <Textarea
            value={value.friends}
            onChange={(e) => set("friends", e.target.value)}
            rows={2}
            className="mt-1 rounded-none border-[3px] border-mm-black bg-mm-paper"
          />
        </div>
      )}
    </div>
  );
}

function TravelerForm({
  index, value, onChange,
}: { index: number; value: TravelerFields; onChange: (v: TravelerFields) => void }) {
  const set = <K extends keyof TravelerFields>(k: K, v: TravelerFields[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3 border-mm-thick bg-mm-paper p-4 text-mm-black shadow-mm md:p-5">
      <h4 className="font-display text-sm tracking-wide">TRAVELLER {String(index).padStart(2, "0")}</h4>
      <div className="grid grid-cols-2 gap-3">
        <Field label="First name" v={value.firstName} onChange={(v) => set("firstName", v)} />
        <Field label="Last name" v={value.lastName} onChange={(v) => set("lastName", v)} />
      </div>
      <Field label="Email" type="email" v={value.email} onChange={(v) => set("email", v)} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Age" type="number" v={value.age} onChange={(v) => set("age", v)} />
        <Field label="Dietary" v={value.dietary} onChange={(v) => set("dietary", v)} />
      </div>
    </div>
  );
}

function Field({ label, v, onChange, type = "text" }: { label: string; v: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <Label className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/80">{label.toUpperCase()}</Label>
      <Input
        type={type}
        value={v}
        onChange={(e) => onChange(e.target.value)}
        onWheel={(e) => type === "number" && (e.target as HTMLInputElement).blur()}
        className="mt-1 h-11 rounded-none border-[3px] border-mm-black bg-mm-paper font-medium"
      />
    </div>
  );
}

function PaymentSummary({
  trip, selected, groupSize, discountAmount = 0,
}: { trip: Trip; selected: Departure; groupSize: number; discountAmount?: number }) {
  const pay = paymentLine(selected.date, groupSize, selected.price);
  const subtotal = selected.price * groupSize;
  return (
    <div>
      <p className="font-sticker text-[10px] tracking-[0.18em] text-mm-black/60">YOUR BOOKING</p>
      <h3 className="mt-1 font-display text-2xl">{trip.name.toUpperCase()} × {groupSize}</h3>
      <dl className="mt-4 space-y-2 text-sm">
        <Row k="Subtotal" v={formatPrice(subtotal)} />
        <Row k="Departure" v={formatDateLong(selected.date)} />
        {discountAmount > 0 && (
          <Row k={`Discount — ${formatPrice(discountAmount)} off`} v={`- ${formatPrice(discountAmount)}`} />
        )}
        <div className="my-2 h-[3px] bg-mm-black" />
        <Row k={pay.type === "deposit" ? "Deposit today" : "Pay today"} v={formatPrice(pay.amount - (pay.type === "full" ? discountAmount : 0))} bold />
        {pay.type === "deposit" && (
          <Row k="Balance auto-charged to your card 7 days before departure" v={formatPrice(subtotal - pay.amount - discountAmount)} muted />
        )}

      </dl>
    </div>
  );
}

function Row({ k, v, bold, muted }: { k: string; v: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-display text-lg" : "font-medium"} ${muted ? "text-xs text-mm-black/60" : ""}`}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
