import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Check, Copy, Download } from "lucide-react";
import { Sticker } from "@/components/brand/Sticker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { registerSquadLeader } from "@/lib/squad";
import { TEMPLATES_DRIVE_URL } from "@/lib/squadConstants";

export default function SquadRegister() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ code: string; accessToken: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
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
      const { accessToken, code } = await registerSquadLeader(f);
      window.scrollTo({ top: 0, behavior: "auto" });
      setSuccess({ code, accessToken, name: f.name });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not register");
    } finally {
      setSubmitting(false);
    }
  }

  function copyCode() {
    if (!success) return;
    navigator.clipboard?.writeText(success.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (success) {
    const firstName = success.name.split(" ")[0];
    return (
      <main className="min-h-screen bg-mm-lime px-5 py-16 text-mm-black md:px-8 md:py-24">
        <div className="mx-auto max-w-2xl">
          <Sticker color="pink" rotate={-4}>YOU'RE IN</Sticker>
          <h1 className="mt-4 font-display text-4xl leading-[0.95] md:text-6xl">
            CONGRATS {firstName.toUpperCase()} — <br className="hidden md:block" />YOU'RE A SQUAD LEADER!
          </h1>
          <p className="mt-4 max-w-xl text-mm-black/80">
            Your unique Squad Code is ready. Share it with your crew — every booking gets
            tracked on your dashboard, and you'll unlock 50% off at 4 bookings and a free trip at 8.
          </p>

          <div className="mt-8 border-mm-thick bg-mm-bone p-6 shadow-mm md:p-8">
            <div className="font-sticker text-[10px] tracking-[0.18em] text-mm-black/70">YOUR SQUAD CODE</div>
            <div className="mt-2 font-display text-4xl tracking-[0.1em] md:text-6xl">{success.code}</div>
            <button
              onClick={copyCode}
              className="mt-4 inline-flex items-center gap-2 border-[3px] border-mm-black bg-mm-paper px-4 py-2 font-display text-sm shadow-mm-sm"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "COPIED" : "COPY CODE"}
            </button>
          </div>

          <div className="mt-6 border-mm-thick bg-mm-paper p-6 shadow-mm md:p-8">
            <Sticker color="orange" rotate={3}>TEMPLATES</Sticker>
            <h2 className="mt-3 font-display text-2xl md:text-3xl">GRAB YOUR SQUAD KIT</h2>
            <p className="mt-2 text-sm text-mm-black/70">
              We've put together story stickers, captions, posters and a few cheeky DM scripts
              to help you rally the crew. All in one Google Drive folder.
            </p>
            <a
              href={TEMPLATES_DRIVE_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-2 border-[3px] border-mm-black bg-mm-orange px-5 py-3 font-display text-mm-black shadow-mm-sm"
            >
              <Download className="h-4 w-4" /> DOWNLOAD TEMPLATES
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              onClick={() => navigate(`/squad-leader/dashboard?token=${encodeURIComponent(success.accessToken)}`)}
              className="h-14 rounded-none border-[3px] border-mm-black bg-mm-pink px-6 font-display text-mm-bone hover:bg-mm-pink shadow-mm"
            >
              GO TO MY DASHBOARD →
            </Button>
            <Link
              to="/squad-leader"
              className="inline-flex h-14 items-center border-[3px] border-mm-black bg-mm-bone px-6 font-display text-mm-black shadow-mm-sm"
            >
              BACK TO HUB
            </Link>
          </div>
        </div>
      </main>
    );
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

          <div className="border-[2px] border-dashed border-mm-black/40 bg-mm-bone/60 p-4 text-xs text-mm-black/80">
            <strong className="font-display tracking-wide">REWARDS:</strong> Get 4 mates to book with your code → your trip is <strong>50% OFF</strong>. Get 8 → your trip is <strong>FREE</strong>.
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
