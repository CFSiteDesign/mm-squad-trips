import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Sticker } from "@/components/brand/Sticker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestSquadPasswordReset } from "@/lib/squad";

export default function SquadForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return toast.error("Enter your email");
    setSubmitting(true);
    try {
      await requestSquadPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-mm-black px-5 py-16 text-mm-bone md:px-8 md:py-24">
      <div className="mx-auto max-w-md">
        <Link to="/squad-leader/login" className="inline-flex items-center gap-2 font-display text-sm text-mm-bone/80 hover:text-mm-bone">
          <ArrowLeft className="h-4 w-4" /> BACK TO LOGIN
        </Link>
        <div className="mt-6">
          <Sticker color="lime" rotate={-3}>RESET</Sticker>
          <h1 className="mt-4 font-display text-4xl md:text-5xl">FORGOT YOUR PASSWORD?</h1>
          <p className="mt-3 text-mm-bone/80">
            Drop your email and we'll send a reset link. It's good for 1 hour.
          </p>
        </div>

        {sent ? (
          <div className="mt-8 border-mm-thick bg-mm-paper p-6 text-mm-black shadow-mm-lg md:p-8">
            <h2 className="font-display text-2xl">CHECK YOUR INBOX 📬</h2>
            <p className="mt-2 text-sm">
              If <strong>{email}</strong> is registered as a squad leader, a reset link is on the way.
            </p>
            <Link
              to="/squad-leader/login"
              className="mt-6 inline-block border-[3px] border-mm-black bg-mm-pink px-5 py-3 font-display text-mm-bone shadow-mm"
            >
              BACK TO LOGIN →
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4 border-mm-thick bg-mm-paper p-6 text-mm-black shadow-mm-lg md:p-8">
            <div>
              <Label className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/80">EMAIL</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 h-11 rounded-none border-[3px] border-mm-black bg-mm-paper font-medium"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="h-14 w-full rounded-none border-[3px] border-mm-black bg-mm-pink font-display text-mm-bone hover:bg-mm-pink shadow-mm"
            >
              {submitting ? "SENDING…" : "SEND RESET LINK →"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
