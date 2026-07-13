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
import { createCheckoutSession, validateDiscount } from "@/lib/api";
import { gtmClearEcommerce, gtmPushEvent } from "@/utils/gtmTracker";
import { buildTripEcommerceItem, CONVERSION_TYPE_ALL_IN, markCheckoutEventOnce } from "@/utils/ecommerceDataLayer";
import { Sticker } from "@/components/brand/Sticker";
import { COUNTRIES } from "@/lib/countries";
import { useSiteVariant, squadPath } from "@/hooks/use-site-variant";

const SOURCES = ["TikTok", "Instagram", "Friend", "Other"] as const;

interface LeadFields {
  name: string; email: string; phone: string; phoneDial: string; country: string; age: string;
  solo: boolean; source: string; friends: string;
}
interface TravelerFields { firstName: string; lastName: string; email: string; age: string; dietary: string; }

const emptyLead: LeadFields = {
  name: "", email: "", phone: "", phoneDial: "44", country: "", age: "", solo: false, source: "", friends: "",
};
const emptyTraveler: TravelerFields = { firstName: "", lastName: "", email: "", age: "", dietary: "" };

export function BookingFlow({ trip }: { trip: Trip }) {
  const variant = useSiteVariant();
  const isStudent = variant === "student";
  const showDurationToggle = ["indonesia", "vietnam", "indonesia-7", "vietnam-7"].includes(trip.slug);
  const [groupSize, setGroupSize] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lead, setLead] = useState<LeadFields>(emptyLead);
  const [travelers, setTravelers] = useState<TravelerFields[]>([]);
  const [discountCode, setDiscountCode] = useState("");
  const [discountState, setDiscountState] = useState<{ valid: boolean; msg: string; amount?: number } | null>(null);
  const [discountLoading, setDiscountLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [joinMode, setJoinMode] = useState(false);
  const [joinCode, setJoinCode] = useState("");

  const visible = useMemo(() => visibleDepartures(trip.departures, groupSize, trip.slug), [trip.departures, groupSize, trip.slug]);
  const closed = useMemo(() => closedDepartures(trip.departures, trip.slug), [trip.departures, trip.slug]);
  const selected = visible.find((d) => d.id === selectedId) ?? null;

  function changeGroup(n: number) {
    setGroupSize(n);
    setSelectedId(null);
    setLead({ ...emptyLead, solo: false });
    setTravelers(Array.from({ length: Math.max(0, n - 1) }, () => ({ ...emptyTraveler })));
  }

  const soloSelected = groupSize === 1 && lead.solo;

  function selectSolo() {
    setGroupSize(1);
    setSelectedId(null);
    setLead({ ...emptyLead, solo: true });
    setTravelers([]);
    setJoinMode(false);
  }

  const validatedFor = useRef<{ depId: string; code: string } | null>(null);

  useEffect(() => {
    const code = discountCode.trim().toUpperCase();
    if (!selected || !code || discountLoading) return;
    if (validatedFor.current?.depId === selected.id && validatedFor.current?.code === code) return;

    setDiscountLoading(true);
    validatedFor.current = { depId: selected.id, code };
    setDiscountState(null);

    const subtotal = selected.price * groupSize;
    validateDiscount({ code, tripSlug: trip.slug, amount: subtotal })
      .then((result) => {
        if (result.valid) {
          setDiscountState({ valid: true, msg: `Applied — ${formatPrice(result.discountAmount ?? 0)} off`, amount: result.discountAmount });
        } else {
          setDiscountState({ valid: false, msg: result.reason || "Code does not exist" });
        }
      })
      .finally(() => setDiscountLoading(false));
  }, [selected, discountCode, discountLoading, groupSize, trip.slug]);

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
        departureId: selected.id,
        groupSize,
        leadBooker: { ...lead, phone: fullPhone },
        travelers: travelerPayload,
        discountCode: discountState?.valid ? discountCode.trim().toUpperCase() : undefined,
        friendsMentioned: lead.friends,
        utm,
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
        <div>
          <Sticker color="yellow" rotate={-4}>STEP UP</Sticker>
          <h2 className="mt-4 font-display text-[2.5rem] leading-[0.92] text-mm-bone md:mt-6 md:text-7xl lg:text-8xl">
            BOOK<br />YOUR SPOT.
          </h2>
        </div>

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
