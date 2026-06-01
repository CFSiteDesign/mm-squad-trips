import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle, Share2 } from "lucide-react";

interface BookingInfo {
  bookingRef: string;
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
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setErr("Missing session id");
      return;
    }
    supabase.functions
      .invoke("booking-lookup", { body: { sessionId } })
      .then(({ data, error }) => {
        if (error || !data?.booking) setErr(error?.message || "Booking not found yet — try refreshing in a few seconds.");
        else setInfo(data.booking as BookingInfo);
      });
  }, [sessionId]);

  return (
    <main className="mx-auto max-w-md px-5 py-16">
      <p className="text-xs uppercase tracking-[0.2em] text-black font-bold">YOU'RE IN</p>
      <h1 className="mt-3 font-['Archivo_Black'] text-4xl">Welcome to the crew.</h1>

      {!info && !err && (
        <div className="mt-8 space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {err && (
        <p className="mt-6 rounded-lg bg-muted p-4 text-sm text-muted-foreground">{err}</p>
      )}

      {info && (
        <>
          <dl className="mt-8 rounded-2xl border border-border bg-card p-5 text-sm">
            <Row k="Booking ref" v={info.bookingRef} bold />
            <Row k="Trip" v={info.tripName} />
            <Row k="Departure" v={info.departureDate} />
            <Row k={info.paymentType === "Deposit" ? "Deposit paid" : "Paid in full"} v={`$${info.amountPaid}`} bold />
            {info.balanceDue > 0 && <Row k="Balance due 60 days before departure" v={`$${info.balanceDue}`} muted />}
          </dl>

          <div className="mt-6 rounded-2xl bg-accent/20 p-5">
            <h2 className="font-bold">Free arrival night, on us 🛏️</h2>
            <p className="mt-1 text-sm text-secondary">
              Arrive any time the Sunday before your trip starts — your first night at Mad Monkey is free.
            </p>
          </div>

          <a
            href="https://wa.me/855000000000"
            className="mt-6 flex items-center justify-center gap-2 rounded-full bg-secondary py-3 text-sm font-bold text-secondary-foreground"
          >
            <MessageCircle className="h-4 w-4" /> Message us on WhatsApp
          </a>

          <button
            type="button"
            onClick={() => navigator.share?.({ title: "I'm going on a Mad Monkey trip", url: window.location.origin })}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-semibold"
          >
            <Share2 className="h-4 w-4" /> Tell a friend
          </button>
        </>
      )}

      <Link to="/" className="mt-10 block text-center text-xs text-muted-foreground underline">
        Back to all trips
      </Link>
    </main>
  );
}

function Row({ k, v, bold, muted }: { k: string; v: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between py-1 ${bold ? "font-bold" : ""} ${muted ? "text-xs text-muted-foreground" : ""}`}>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
