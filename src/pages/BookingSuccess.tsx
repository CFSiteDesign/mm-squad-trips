import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Share2 } from "lucide-react";
import { gtmClearEcommerce, gtmPushEvent } from "@/utils/gtmTracker";
import {
  buildGa4Item,
  CONVERSION_TYPE_ALL_IN,
  ITEM_CATEGORY_ALL_IN,
  LIST_ID_ALL_IN,
  LIST_NAME_ALL_IN,
  markCheckoutEventOnce,
} from "@/utils/ecommerceDataLayer";

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

  // NOTE (documented limitation): booking-lookup only returns
  // tripName/departureDate/amountPaid — not trip slug, groupSize, or
  // per-spot discount — so this item is coarser than view_item/begin_checkout.
  // For deposit bookings, `amountPaid` is the deposit only ($99/spot), not the
  // full trip price — the balance auto-charged 7 days before departure has no
  // client-side moment to report to GA4, so revenue here reads as
  // deposit-moment revenue, not total revenue collected.
  useEffect(() => {
    if (!info || !sessionId) return;
    if (!markCheckoutEventOnce("purchase", sessionId)) return;
    gtmClearEcommerce();
    gtmPushEvent("purchase", {
      conversion_type: CONVERSION_TYPE_ALL_IN,
      ecommerce: {
        transaction_id: sessionId,
        currency: "USD",
        value: info.amountPaid,
        items: [
          buildGa4Item({
            item_id: info.tripName,
            item_name: info.tripName,
            price: info.amountPaid,
            quantity: 1,
            item_category: ITEM_CATEGORY_ALL_IN,
            item_variant: info.paymentType,
            item_list_id: LIST_ID_ALL_IN,
            item_list_name: LIST_NAME_ALL_IN,
          }),
        ],
      },
    });
  }, [info, sessionId]);

  const refDisplay =
    refStatus === "ready" ? (info?.bookingRef ?? "") :
    refStatus === "loading" ? "Generating…" :
    "";

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

      {err && !info && (
        <p className="mt-6 rounded-lg bg-muted p-4 text-sm text-muted-foreground">{err}</p>
      )}

      {info && (
        <>
          <dl className="mt-8 rounded-2xl border border-border bg-card p-5 text-sm">
            <Row k="Booking ref" v={refDisplay} bold />

            <Row k="Trip" v={info.tripName} />
            <Row k="Departure" v={info.departureDate} />
            <Row k={info.paymentType === "Deposit" ? "Deposit paid" : "Paid in full"} v={`$${info.amountPaid}`} bold />
            {info.balanceDue > 0 && <Row k="Balance auto-charged 7 days before departure" v={`$${info.balanceDue}`} muted />}
          </dl>

          <div className="mt-6 rounded-2xl bg-accent/20 p-5">
            <h2 className="font-bold">Free arrival night, on us 🛏️</h2>
            <p className="mt-1 text-sm text-secondary">
              Arrive any time the Sunday before your trip starts — your first night at Mad Monkey is free.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigator.share?.({ title: "I'm going on a Mad Monkey trip", url: window.location.origin })}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-border py-3 text-sm font-semibold"
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
