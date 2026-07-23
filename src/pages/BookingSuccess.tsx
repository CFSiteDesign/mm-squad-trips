import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2 } from "lucide-react";
import { Sticker } from "@/components/brand/Sticker";

interface BookingInfo {
  bookingRef: string | null;
  tripName: string;
  departureDate: string;
  amountPaid: number;
  balanceDue: number;
  paymentType: "Deposit" | "Full";
}

export default function BookingSuccess() {
  const [params] = useSearchParams();
  const sessionId = params.get("session_id");
  const [info, setInfo] = useState<BookingInfo | null>(null);
  const [refStatus, setRefStatus] = useState<"loading" | "ready" | "missing">("loading");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setErr("Missing session id");
      return;
    }
    let cancelled = false;
    const MAX_ATTEMPTS = 5;

    (async () => {
      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const { data, error } = await supabase.functions.invoke("booking-lookup", { body: { sessionId } });
        if (cancelled) return;
        if (error || !data?.booking) {
          if (attempt === MAX_ATTEMPTS) {
            setErr(error?.message || "Could not load your booking.");
            return;
          }
          await new Promise((r) => setTimeout(r, 1000));
          continue;
        }
        const b = data.booking as BookingInfo;
        setInfo(b);
        if (b.bookingRef) {
          setRefStatus("ready");
          return;
        }
        if (attempt === MAX_ATTEMPTS) {
          setRefStatus("missing");
          return;
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    })();

    return () => { cancelled = true; };
  }, [sessionId]);

  const refDisplay =
    refStatus === "ready" ? (info?.bookingRef ?? "") :
    refStatus === "loading" ? "Generating…" :
    "";

  return (
    <main className="min-h-screen bg-mm-black px-5 py-12 pt-24 text-mm-bone md:pt-28">
      <div className="mx-auto max-w-md">
        <Sticker color="lime" rotate={-3}>YOU'RE IN</Sticker>
        <h1 className="mt-4 font-display text-5xl leading-[0.92] md:text-6xl">
          WELCOME TO<br /><span className="text-mm-lime">THE CREW.</span>
        </h1>

        {!info && !err && (
          <div className="mt-8 space-y-3">
            <Skeleton className="h-32 w-full rounded-none bg-mm-bone/10" />
            <Skeleton className="h-12 w-full rounded-none bg-mm-bone/10" />
          </div>
        )}

        {err && !info && (
          <p className="mt-8 border-[3px] border-mm-bone bg-mm-black/60 p-4 text-sm text-mm-bone/80">{err}</p>
        )}

        {info && (
          <>
            <dl className="mt-8 border-[3px] border-mm-black bg-mm-paper p-5 text-sm text-mm-black shadow-mm">
              <Row k="Booking ref" v={refDisplay} bold />
              <Row k="Trip" v={info.tripName} />
              <Row k="Departure" v={info.departureDate} />
              <Row k={info.paymentType === "Deposit" ? "Deposit paid" : "Paid in full"} v={`$${info.amountPaid}`} bold />
              {info.balanceDue > 0 && <Row k="Balance auto-charged 7 days before departure" v={`$${info.balanceDue}`} muted />}
            </dl>

            <div className="mt-5 border-[3px] border-mm-black bg-mm-lime p-5 text-mm-black shadow-mm">
              <h2 className="font-display text-lg">FREE ARRIVAL NIGHT, ON US 🛏️</h2>
              <p className="mt-1 text-sm font-medium">
                Arrive any time the day before your trip starts — your first night at Mad Monkey is free.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigator.share?.({ title: "I'm going on a Mad Monkey trip", url: window.location.origin })}
              className="mt-5 flex w-full items-center justify-center gap-2 border-[3px] border-mm-black bg-mm-orange py-3.5 font-display text-sm text-mm-black shadow-mm transition-transform hover:-translate-x-[2px] hover:-translate-y-[2px]"
            >
              <Share2 className="h-4 w-4" /> TELL A FRIEND
            </button>
          </>
        )}

        <Link
          to="/"
          className="mt-8 block text-center font-sticker text-[10px] tracking-[0.18em] text-mm-bone/60 underline hover:text-mm-bone"
        >
          BACK TO ALL TRIPS
        </Link>
      </div>
    </main>
  );
}

function Row({ k, v, bold, muted }: { k: string; v: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between gap-4 border-b border-mm-black/15 py-2 last:border-b-0 ${bold ? "font-display" : "font-medium"} ${muted ? "text-xs text-mm-black/60" : ""}`}>
      <dt>{k}</dt>
      <dd className="text-right">{v}</dd>
    </div>
  );
}
