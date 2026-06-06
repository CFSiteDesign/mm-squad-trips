import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Sticker } from "@/components/brand/Sticker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { registerSquadLeader } from "@/lib/squad";

export default function SquadRegister() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [f, setF] = useState({
    name: "", email: "", phone: "", instagram: "",
    preferred_trip_slug: "indonesia", preferred_month: "", reason: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: string) => setF((s) => ({ ...s, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name || !f.email || !f.phone) return toast.error("Fill in the required fields");
    setSubmitting(true);
    try {
      const { accessToken } = await registerSquadLeader(f);
      navigate(`/squad-leader/dashboard?token=${encodeURIComponent(accessToken)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-mm-pink px-5 py-16 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-2xl">
        <Link to="/squad-leader" className="font-sticker text-[11px] tracking-[0.15em] text-mm-bone/80 hover:underline">
          ← BACK TO HUB
        </Link>
        <div className="mt-4">
          <Sticker color="yellow" rotate={-4}>APPLY</Sticker>
          <h1 className="mt-4 font-display text-4xl md:text-6xl">BECOME A SQUAD LEADER</h1>
          <p className="mt-3 text-mm-bone/80">
            Tell us about yourself and we'll generate your unique Squad Code.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4 border-mm-thick bg-mm-paper p-6 text-mm-black shadow-mm-lg md:p-8">
          <Field label="Full name *" v={f.name} onChange={(v) => set("name", v)} />
          <Field label="Email *" type="email" v={f.email} onChange={(v) => set("email", v)} />
          <Field label="Phone *" type="tel" v={f.phone} onChange={(v) => set("phone", v)} />
          <Field label="Instagram handle (optional)" v={f.instagram} onChange={(v) => set("instagram", v)} />
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
          <div>
            <Label className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/80">WHY DO YOU WANT TO LEAD A SQUAD?</Label>
            <Textarea
              value={f.reason}
              onChange={(e) => set("reason", e.target.value)}
              rows={3}
              className="mt-1 rounded-none border-[3px] border-mm-black bg-mm-paper"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="h-14 w-full rounded-none border-[3px] border-mm-black bg-mm-orange font-display text-mm-black hover:bg-mm-orange shadow-mm"
          >
            {submitting ? "GENERATING YOUR CODE…" : "GET MY SQUAD CODE →"}
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
