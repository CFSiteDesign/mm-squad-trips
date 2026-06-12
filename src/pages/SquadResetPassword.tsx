import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Sticker } from "@/components/brand/Sticker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { confirmSquadPasswordReset } from "@/lib/squad";

export default function SquadResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => params.get("token") ?? "", [params]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return toast.error("Missing reset token");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    if (password !== confirm) return toast.error("Passwords don't match");
    setSubmitting(true);
    try {
      await confirmSquadPasswordReset(token, password);
      toast.success("Password reset — log in with your new password");
      navigate("/squad-leader/login");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reset password");
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
          <Sticker color="lime" rotate={-3}>NEW PASSWORD</Sticker>
          <h1 className="mt-4 font-display text-4xl md:text-5xl">SET A NEW PASSWORD</h1>
          <p className="mt-3 text-mm-bone/80">Pick something at least 6 characters long.</p>
        </div>

        {!token ? (
          <div className="mt-8 border-mm-thick bg-mm-paper p-6 text-mm-black shadow-mm-lg md:p-8">
            <p className="font-display text-lg">Reset link is missing its token.</p>
            <p className="mt-2 text-sm">Request a new one from the forgot-password page.</p>
            <Link
              to="/squad-leader/forgot-password"
              className="mt-6 inline-block border-[3px] border-mm-black bg-mm-pink px-5 py-3 font-display text-mm-bone shadow-mm"
            >
              REQUEST NEW LINK →
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4 border-mm-thick bg-mm-paper p-6 text-mm-black shadow-mm-lg md:p-8">
            <div>
              <Label className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/80">NEW PASSWORD</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 h-11 rounded-none border-[3px] border-mm-black bg-mm-paper font-medium"
              />
            </div>
            <div>
              <Label className="font-sticker text-[10px] tracking-[0.15em] text-mm-black/80">CONFIRM PASSWORD</Label>
              <Input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-1 h-11 rounded-none border-[3px] border-mm-black bg-mm-paper font-medium"
              />
            </div>
            <Button
              type="submit"
              disabled={submitting}
              className="h-14 w-full rounded-none border-[3px] border-mm-black bg-mm-pink font-display text-mm-bone hover:bg-mm-pink shadow-mm"
            >
              {submitting ? "SAVING…" : "SAVE NEW PASSWORD →"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
