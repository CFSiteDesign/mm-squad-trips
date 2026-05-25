// Look up a Booking by Stripe session ID for the confirmation page.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { airtableGet } from "../_shared/airtable.ts";

interface BookingFields {
  "Booking Ref": string;
  "Departure": string[];
  "Trip": string[];
  "Amount Paid": number;
  "Balance Due": number;
  "Payment Type": "Deposit" | "Full";
}
interface DepFields { "Departure Date": string }
interface TripFields { "Trip Name": string }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { sessionId } = await req.json();
    if (!sessionId) return jr({ error: "sessionId required" }, 400);
    const rows = await airtableGet<BookingFields>("Bookings", {
      filterByFormula: `{Stripe Session ID} = "${String(sessionId).replace(/"/g, "")}"`,
      maxRecords: "1",
    });
    if (!rows[0]) return jr({ error: "Booking not found yet" }, 404);
    const b = rows[0].fields;

    let departureDate = "";
    if (b.Departure?.[0]) {
      const dep = await airtableGet<DepFields>("Departures", {
        filterByFormula: `RECORD_ID() = "${b.Departure[0]}"`,
        maxRecords: "1",
      });
      departureDate = dep[0]?.fields["Departure Date"] ?? "";
    }
    let tripName = "";
    if (b.Trip?.[0]) {
      const tr = await airtableGet<TripFields>("Trips", {
        filterByFormula: `RECORD_ID() = "${b.Trip[0]}"`,
        maxRecords: "1",
      });
      tripName = tr[0]?.fields["Trip Name"] ?? "";
    }
    return jr({
      booking: {
        bookingRef: b["Booking Ref"],
        tripName,
        departureDate,
        amountPaid: b["Amount Paid"],
        balanceDue: b["Balance Due"] ?? 0,
        paymentType: b["Payment Type"],
      },
    });
  } catch (e) {
    return jr({ error: e instanceof Error ? e.message : "error" }, 500);
  }
});

function jr(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
