import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Sticker } from "@/components/brand/Sticker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSquadLeader } from "@/lib/squad";
import { gtmPushEvent } from "@/utils/gtmTracker";

export default function StudentSquadRegister() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [pendingDone, setPendingDone] = useState(false);

  const [searchParams] = useSearchParams();
  const tripFromUrl = searchParams.get("trip");
  const validTrips = ["indonesia", "cambodia", "vietnam"];
  const initialTrip = validTrips.includes(tripFromUrl || "") ? tripFromUrl! : "indonesia";

  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    instagram: "",
    university: "",
    society: "",
    preferred_trip_slug: initialTrip,
    preferred_month: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name || !f.email || !f.phone || !f.university) {
      return toast.error("Fill in the required fields");
    }
    setSubmitting(true);
    try {
      await registerSquadLeader({ ...f, is_student: true });
      setPendingDone(true);
      window.scrollTo({ top: 0, behavior: "auto" });
      gtmPushEvent("sign_up", { method: "squad_leader_student" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit application");
    } finally {
      setSubmitting(false);
    }
  }

  if (pendingDone) {
    return (
      <main className="min-h-screen bg-mm-lime px-5 py-16 text-mm-black md:px-8 md:py-24">
        <div className="mx-auto max-w-2xl">
          <Sticker color="pink" rotate={-4}>APPLICATION RECEIVED</Sticker>
          <h1 className="mt-4 font-display text-4xl leading-[0.95] md:text-6xl">
            THANKS — WE'VE GOT IT.
          </h1>
          <p className="mt-4 max-w-xl text-mm-black/80">
            Hayley will review your application and email you once you're approved. Then you'll get your unique Squad Code and dashboard link.
          </p>
          <button
            onClick={() => navigate("/students/squad-leader", { replace: true })}
            className="mt-8 inline-flex h-14 items-center border-[3px] border-mm-black bg-mm-bone px-6 font-display text-mm-black shadow-mm-sm"
          >
            BACK TO HUB
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-mm-pink px-5 py-16 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => navigate("/students/squad-leader", { replace: true })}
          className="font-sticker text-[11px] tracking-[0.15em] text-mm-bone/80 hover:underline"
        >
          ← BACK
        </button>
        <div className="mt-4">
          <Sticker color="yellow" rotate={-4}>APPLY</Sticker>
          <h1 className="mt-4 font-display text-4xl md:text-6xl">BECOME A STUDENT SQUAD LEADER</h1>
          <p className="mt-3 text-mm-bone/80">
            Tell us about yourself and your university. Hayley will review and email you once you're approved.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4 border-mm-thick bg-mm-paper p-6 text-mm-black shadow-mm-lg md:p-8">
          <Field label="Full name *" v={f.name} onChange={(v) => set("name", v)} />
          <Field label="Email *" type="email" v={f.email} onChange={(v) => set("email", v)} />
          <Field label="Phone *" type="tel" v={f.phone} onChange={(v) => set("phone", v)} />
          <Field label="Instagram handle (optional)" v={f.instagram} onChange={(v) => set("instagram", v)} />
          <Field label="University *" v={f.university} onChange={(v) => set("university", v)} />
          <Field label="Society (optional)" v={f.society} onChange={(v) => set("society", v)} />
          <div>
            <Label className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/80">WHICH TRIP DO YOU WANT TO LEAD?</Label>
            <select
              value={f.preferred_trip_slug}
              onChange={(e) => set("preferred_trip_slug", e.target.value)}
              className="mt-1 h-11 w-full rounded-none border-[3px] border-mm-black bg-mm-paper px-3 font-medium"
            >
              <option value="indonesia">Indonesia</option>
              <option value="cambodia">Cambodia</option>
              <option value="vietnam">Vietnam</option>
            </select>
          </div>
          <Field label="Departure month (optional)" v={f.preferred_month} onChange={(v) => set("preferred_month", v)} />

          <div className="border-[2px] border-dashed border-mm-black/40 bg-mm-bone/60 p-4 text-xs text-mm-black/80">
            <strong className="font-display tracking-wide">REWARD:</strong> 2 free squad leader spots when 10 people book with your code.
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="h-14 w-full rounded-none border-[3px] border-mm-black bg-mm-orange font-display text-mm-black hover:bg-mm-orange shadow-mm"
          >
            {submitting ? "SUBMITTING…" : "SUBMIT APPLICATION →"}
          </Button>
        </form>
      </div>
    </main>
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
