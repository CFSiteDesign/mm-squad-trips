import { useMemo, useState } from "react";
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
} from "@/lib/trip-helpers";
import { SpotBadge } from "./SpotBadge";
import type { Trip, Departure } from "@/types/trip";
import { createCheckoutSession, validateDiscount } from "@/lib/api";
import { Sticker } from "@/components/brand/Sticker";
import { COUNTRIES } from "@/lib/countries";

const SOURCES = ["TikTok", "Instagram", "Friend", "Other"] as const;

interface LeadFields {
  name: string; email: string; phone: string; phoneDial: string; country: string; age: string;
  solo: boolean; source: string; friends: string;
}
interface TravelerFields { firstName: string; lastName: string; email: string; age: string; dietary: string; }

const emptyLead: LeadFields = {
  name: "", email: "", phone: "", phoneDial: "44", country: "", age: "", solo: true, source: "", friends: "",
};
const emptyTraveler: TravelerFields = { firstName: "", lastName: "", email: "", age: "", dietary: "" };

export function BookingFlow({ trip }: { trip: Trip }) {
  const [groupSize, setGroupSize] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lead, setLead] = useState<LeadFields>(emptyLead);
  const [travelers, setTravelers] = useState<TravelerFields[]>([]);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState("");
  const [discountState, setDiscountState] = useState<{ valid: boolean; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const visible = useMemo(() => visibleDepartures(trip.departures, groupSize), [trip.departures, groupSize]);
  const selected = visible.find((d) => d.id === selectedId) ?? null;

  function changeGroup(n: number) {
    setGroupSize(n);
    setSelectedId(null);
    setLead({ ...emptyLead, solo: n === 1 });
    setTravelers(Array.from({ length: Math.max(0, n - 1) }, () => ({ ...emptyTraveler })));
  }

  async function tryDiscount() {
    if (!selected || !discountCode.trim()) return;
    const subtotal = selected.price * groupSize;
    const result = await validateDiscount({
      code: discountCode.trim().toUpperCase(),
      tripSlug: trip.slug,
      amount: subtotal,
    });
    if (result.valid) {
      setDiscountState({ valid: true, msg: `Applied — ${formatPrice(result.discountAmount ?? 0)} off` });
    } else {
      setDiscountState({ valid: false, msg: result.reason || "Code not valid" });
    }
  }

  async function submit() {
    if (!selected) return toast.error("Pick a departure first");
    if (!lead.name || !lead.email || !lead.phone) return toast.error("Fill out your details");
    setSubmitting(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const utm: Record<string, string> = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach((k) => {
        const v = params.get(k); if (v) utm[k] = v;
      });
      const { url } = await createCheckoutSession({
        tripSlug: trip.slug,
        departureId: selected.id,
        groupSize,
        leadBooker: lead,
        travelers,
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
        <div>
          <Sticker color="yellow" rotate={-4}>STEP UP</Sticker>
          <h2 className="mt-4 font-display text-[2.5rem] leading-[0.92] text-mm-bone md:mt-6 md:text-7xl lg:text-8xl">
            BOOK<br />YOUR SPOT.
          </h2>
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
          {visible.length === 0 ? (
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

            <FormStep n={4} label="GOT A CODE?">
              <button
                type="button"
                onClick={() => setDiscountOpen((o) => !o)}
                className="font-sticker text-xs tracking-[0.15em] text-mm-lime underline-offset-4 hover:underline"
              >
                {discountOpen ? "HIDE" : "ENTER A DISCOUNT CODE"}
              </button>
              {discountOpen && (
                <div className="mt-3 flex gap-3">
                  <Input
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="MADMONKEY50"
                    className="h-12 rounded-none border-[3px] border-mm-black bg-mm-paper text-mm-black uppercase font-display tracking-wide"
                  />
                  <Button
                    type="button"
                    onClick={tryDiscount}
                    className="h-12 rounded-none border-[3px] border-mm-black bg-mm-orange font-display text-mm-black hover:bg-mm-orange shadow-mm-sm"
                  >
                    APPLY
                  </Button>
                </div>
              )}
              {discountState && (
                <p className={`mt-3 font-sticker text-[11px] tracking-[0.15em] ${discountState.valid ? "text-mm-lime" : "text-mm-pink"}`}>
                  {discountState.msg.toUpperCase()}
                </p>
              )}
            </FormStep>

            <div className="border-mm-thick bg-mm-paper p-4 text-mm-black shadow-mm-lg md:p-6">
              <PaymentSummary trip={trip} selected={selected} groupSize={groupSize} />
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

function LeadForm({
  value, onChange, groupSize,
}: { value: LeadFields; onChange: (v: LeadFields) => void; groupSize: number }) {
  const set = <K extends keyof LeadFields>(k: K, v: LeadFields[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3 border-mm-thick bg-mm-paper p-4 text-mm-black shadow-mm md:p-5">

      <h4 className="font-display text-sm tracking-wide">{groupSize > 1 ? "LEAD BOOKER (YOU)" : "YOUR DETAILS"}</h4>
      <Field label="Full name" v={value.name} onChange={(v) => set("name", v)} />
      <Field label="Email" type="email" v={value.email} onChange={(v) => set("email", v)} />
      <Field label="Phone" type="tel" v={value.phone} onChange={(v) => set("phone", v)} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Country" v={value.country} onChange={(v) => set("country", v)} />
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
        className="mt-1 h-11 rounded-none border-[3px] border-mm-black bg-mm-paper font-medium"
      />
    </div>
  );
}

function PaymentSummary({
  trip, selected, groupSize,
}: { trip: Trip; selected: Departure; groupSize: number }) {
  const pay = paymentLine(selected.date, groupSize, selected.price);
  const subtotal = selected.price * groupSize;
  return (
    <div>
      <p className="font-sticker text-[10px] tracking-[0.18em] text-mm-black/60">YOUR BOOKING</p>
      <h3 className="mt-1 font-display text-2xl">{trip.name.toUpperCase()} × {groupSize}</h3>
      <dl className="mt-4 space-y-2 text-sm">
        <Row k="Subtotal" v={formatPrice(subtotal)} />
        <Row k="Departure" v={formatDateLong(selected.date)} />
        <div className="my-2 h-[3px] bg-mm-black" />
        <Row k={pay.type === "deposit" ? "Deposit today" : "Pay today"} v={formatPrice(pay.amount)} bold />
        {pay.type === "deposit" && (
          <Row k="Balance due 60 days before departure" v={formatPrice(subtotal - pay.amount)} muted />
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
