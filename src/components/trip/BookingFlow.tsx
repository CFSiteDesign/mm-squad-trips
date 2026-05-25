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

const SOURCES = ["TikTok", "Instagram", "Friend", "Other"] as const;

interface LeadFields {
  name: string;
  email: string;
  phone: string;
  country: string;
  age: string;
  solo: boolean;
  source: string;
  friends: string;
}

interface TravelerFields {
  firstName: string;
  lastName: string;
  email: string;
  age: string;
  dietary: string;
}

const emptyLead: LeadFields = {
  name: "", email: "", phone: "", country: "", age: "", solo: true, source: "", friends: "",
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
    if (!selected) return toast.error("Pick a departure date first");
    if (!lead.name || !lead.email || !lead.phone) return toast.error("Fill out your details");
    setSubmitting(true);
    try {
      const params = new URLSearchParams(window.location.search);
      const utm: Record<string, string> = {};
      ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach((k) => {
        const v = params.get(k);
        if (v) utm[k] = v;
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
    <section id="booking" className="px-5 py-14">
      <div className="mx-auto max-w-2xl space-y-8">
        <h2 className="font-['Archivo_Black'] text-3xl">Book your spot</h2>

        {/* Step 1: spots */}
        <div>
          <Label className="text-sm font-bold uppercase tracking-wider">1. How many spots?</Label>
          <Select value={String(groupSize)} onValueChange={(v) => changeGroup(Number(v))}>
            <SelectTrigger className="mt-2 h-12 w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Step 2: departure */}
        <div>
          <Label className="text-sm font-bold uppercase tracking-wider">2. Pick your departure</Label>
          {visible.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No departures with {groupSize} spot{groupSize > 1 ? "s" : ""} available right now.
            </p>
          ) : (
            <div className="mt-3 -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0">
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
        </div>

        {selected && (
          <>
            {/* Step 3: traveler details */}
            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-wider">3. Your details</Label>
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

            {/* Step 4: discount */}
            <div>
              <button
                type="button"
                onClick={() => setDiscountOpen((o) => !o)}
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Have a code?
              </button>
              {discountOpen && (
                <div className="mt-2 flex gap-2">
                  <Input
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value.toUpperCase())}
                    placeholder="MADMONKEY50"
                    className="h-11 uppercase"
                  />
                  <Button type="button" variant="secondary" onClick={tryDiscount} className="h-11">
                    Apply
                  </Button>
                </div>
              )}
              {discountState && (
                <p className={`mt-2 text-sm ${discountState.valid ? "text-[hsl(var(--spot-green))]" : "text-destructive"}`}>
                  {discountState.msg}
                </p>
              )}
            </div>

            {/* Step 5: pay */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <PaymentSummary trip={trip} selected={selected} groupSize={groupSize} />
              <Button
                disabled={submitting}
                onClick={submit}
                size="lg"
                className="mt-5 h-14 w-full rounded-full bg-primary text-base font-bold text-primary-foreground hover:bg-primary/90"
              >
                {submitting ? "Redirecting…" : "Continue to payment"}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Secure payment via Stripe. Your spot is held the moment you pay.
              </p>
            </div>
          </>
        )}
      </div>
    </section>
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
      className={`flex w-[220px] shrink-0 snap-start flex-col rounded-2xl border-2 p-4 text-left transition md:w-auto ${
        selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50"
      }`}
    >
      <span className="text-sm font-bold">{formatDateLong(dep.date)}</span>
      <SpotBadge badge={badge} className="mt-2 self-start" />
      <span className="mt-3 text-[11px] text-muted-foreground">{freeArrivalNightLine(dep.date)}</span>
      <span className="mt-1 text-xs font-semibold text-foreground">{pay.label}</span>
    </button>
  );
}

function LeadForm({
  value, onChange, groupSize,
}: { value: LeadFields; onChange: (v: LeadFields) => void; groupSize: number }) {
  const set = <K extends keyof LeadFields>(k: K, v: LeadFields[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h4 className="text-sm font-bold">{groupSize > 1 ? "Lead booker (you)" : "Your details"}</h4>
      <Field label="Full name" v={value.name} onChange={(v) => set("name", v)} />
      <Field label="Email" type="email" v={value.email} onChange={(v) => set("email", v)} />
      <Field label="Phone" type="tel" v={value.phone} onChange={(v) => set("phone", v)} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Country" v={value.country} onChange={(v) => set("country", v)} />
        <Field label="Age" type="number" v={value.age} onChange={(v) => set("age", v)} />
      </div>
      {groupSize === 1 && (
        <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
          <Label htmlFor="solo" className="text-sm">Travelling solo?</Label>
          <Switch id="solo" checked={value.solo} onCheckedChange={(v) => set("solo", v)} />
        </div>
      )}
      <div>
        <Label className="text-xs">Where did you hear about us?</Label>
        <Select value={value.source} onValueChange={(v) => set("source", v)}>
          <SelectTrigger className="mt-1 h-11"><SelectValue placeholder="Choose one" /></SelectTrigger>
          <SelectContent>
            {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {groupSize === 1 && (
        <div>
          <Label className="text-xs">Coming with friends booking separately? Add their names so we group you</Label>
          <Textarea
            value={value.friends}
            onChange={(e) => set("friends", e.target.value)}
            rows={2}
            className="mt-1"
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
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h4 className="text-sm font-bold">Traveller {index}</h4>
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
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={v} onChange={(e) => onChange(e.target.value)} className="mt-1 h-11" />
    </div>
  );
}

function PaymentSummary({
  trip, selected, groupSize,
}: { trip: Trip; selected: Departure; groupSize: number }) {
  const pay = paymentLine(selected.date, groupSize, selected.price);
  const subtotal = selected.price * groupSize;
  return (
    <dl className="space-y-1 text-sm">
      <Row k={`${trip.name} × ${groupSize}`} v={formatPrice(subtotal)} />
      <Row k="Departure" v={formatDateLong(selected.date)} />
      <Row k={pay.type === "deposit" ? "Deposit today" : "Pay today"} v={formatPrice(pay.amount)} bold />
      {pay.type === "deposit" && (
        <Row k="Balance due 60 days before departure" v={formatPrice(subtotal - pay.amount)} muted />
      )}
    </dl>
  );
}

function Row({ k, v, bold, muted }: { k: string; v: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-base font-bold" : ""} ${muted ? "text-xs text-muted-foreground" : ""}`}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
