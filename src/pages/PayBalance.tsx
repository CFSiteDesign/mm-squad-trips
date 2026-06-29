import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sticker } from "@/components/brand/Sticker";
import { SiteFooter } from "@/components/trip/SiteFooter";

type State =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "paying" }
  | { kind: "alreadyPaid" }
  | { kind: "error"; message: string };

export default function PayBalance() {
  const [params] = useSearchParams();
  const ref = params.get("ref") ?? "";
  const email = params.get("email") ?? "";
  const [state, setState] = useState<State>(
    ref && email ? { kind: "ready" } : { kind: "error", message: "Missing booking ref or email in the link." },
  );

  async function startPayment() {
    setState({ kind: "paying" });
    try {
      const { data, error } = await supabase.functions.invoke("create-balance-payment-link", {
        body: { bookingRef: ref, leadEmail: email },
      });
      if (error) {
        const ctx = (error as { context?: { alreadyPaid?: boolean } }).context;
        if (ctx?.alreadyPaid) {
          setState({ kind: "alreadyPaid" });
          return;
        }
        throw error;
      }
      const url = (data as { url?: string })?.url;
      if (!url) throw new Error("No checkout URL returned");
      window.location.href = url;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not start checkout";
      setState({ kind: "error", message });
    }
  }

  // Auto-start if the link is well-formed
  useEffect(() => {
    if (state.kind === "ready") {
      startPayment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen bg-mm-black text-mm-bone">
      <section className="px-5 pt-24 pb-16 md:px-8 md:pt-32 md:pb-24">
        <div className="mx-auto max-w-2xl">
          <Sticker color="lime" rotate={-3}>FINAL BALANCE</Sticker>
          <h1 className="mt-5 font-display text-[2.5rem] leading-[0.92] md:text-6xl">
            PAY YOUR<br /><span className="text-mm-lime">TRIP BALANCE.</span>
          </h1>

          <div className="mt-8 border-mm-thick bg-mm-bone p-6 text-mm-black shadow-mm md:p-8">
            <p className="font-sticker text-[11px] tracking-[0.18em] text-mm-black/60">BOOKING REF</p>
            <p className="mt-1 font-display text-2xl">{ref || "—"}</p>
            <p className="mt-4 font-sticker text-[11px] tracking-[0.18em] text-mm-black/60">EMAIL</p>
            <p className="mt-1 font-display text-lg break-all">{email || "—"}</p>

            <div className="mt-6 border-t-[3px] border-mm-black pt-6">
              {state.kind === "loading" || state.kind === "ready" || state.kind === "paying" ? (
                <p className="font-display text-base">
                  {state.kind === "paying" ? "Sending you to Stripe…" : "Loading…"}
                </p>
              ) : state.kind === "alreadyPaid" ? (
                <p className="font-display text-base text-mm-black">
                  This balance has already been paid. Nothing else to do — see you on the trip 🎒
                </p>
              ) : (
                <>
                  <p className="font-display text-base text-mm-black">{state.message}</p>
                  <button
                    onClick={startPayment}
                    className="mt-5 inline-flex items-center border-[3px] border-mm-black bg-mm-orange px-6 py-3 font-display text-sm text-mm-black shadow-mm transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px]"
                  >
                    TRY AGAIN
                  </button>
                </>
              )}
            </div>
          </div>

          <p className="mt-6 text-sm text-mm-bone/70">
            Trouble? Email <a href="mailto:cs@madmonkeyhostels.com" className="underline">cs@madmonkeyhostels.com</a> with your booking ref.
          </p>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
