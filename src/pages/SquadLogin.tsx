import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Sticker } from "@/components/brand/Sticker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSquadLeader } from "@/lib/squad";

export default function SquadLogin() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !password) return toast.error("Enter your squad code and password");
    setSubmitting(true);
    try {
      const token = await loginSquadLeader(code.trim(), password);
      navigate(`/squad-leader/dashboard?token=${encodeURIComponent(token)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not log in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-mm-black px-5 py-16 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-md">
        <Link to="/squad-leader" className="inline-flex items-center gap-2 font-display text-sm text-mm-bone/80 hover:text-mm-bone">
          <ArrowLeft className="h-4 w-4" /> BACK TO HUB
        </Link>
        <div className="mt-6">
          <Sticker color="lime" rotate={-3}>LOG IN</Sticker>
          <h1 className="mt-4 font-display text-4xl md:text-5xl">SQUAD LEADER LOG IN</h1>
          <p className="mt-3 text-mm-bone/80">
            Enter your squad code and password to jump back into your dashboard.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-8 space-y-4 border-mm-thick bg-mm-paper p-6 text-mm-black shadow-mm-lg md:p-8">
          <div>
            <Label className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/80">SQUAD CODE</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              maxLength={5}
              placeholder="12345"
              className="mt-1 h-11 rounded-none border-[3px] border-mm-black bg-mm-paper font-display tracking-[0.15em]"
            />
          </div>
          <div>
            <Label className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/80">PASSWORD</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 h-11 rounded-none border-[3px] border-mm-black bg-mm-paper font-medium"
            />
          </div>
          <Button
            type="submit"
            disabled={submitting}
            className="h-14 w-full rounded-none border-[3px] border-mm-black bg-mm-pink font-display text-mm-bone hover:bg-mm-pink shadow-mm"
          >
            {submitting ? "LOGGING IN…" : "GO TO MY DASHBOARD →"}
          </Button>
          <p className="pt-2 text-center text-xs text-mm-black/70">
            Don't have a code yet?{" "}
            <Link to="/squad-leader/register" className="underline font-display">BECOME A SQUAD LEADER</Link>
          </p>
        </form>
      </div>
    </main>
  );
}
