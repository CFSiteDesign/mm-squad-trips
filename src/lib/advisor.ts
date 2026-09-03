// "Talk to an advisor" enquiries from the trip pages.
//
// Kyle's note: custom dates come out, replaced by an advisor option where you
// leave a WhatsApp number or an email only — "this then sends to the same
// database". Rows land in public.advisor_enquiries alongside the bookings.
//
// Submissions go through the advisor-enquiry edge function, which stores the
// row and emails ops in the same breath. The table's anon insert policy still
// exists, but the browser no longer writes to it directly.
import { supabase } from "@/integrations/supabase/client";

export type ContactMethod = "whatsapp" | "email";

export interface AdvisorEnquiry {
  tripSlug: string;
  tripName: string;
  method: ContactMethod;
  /** The number or address, as typed. */
  value: string;
}

/** Loose on purpose — an advisor is going to read these, not a mail server. */
export function validateContact(method: ContactMethod, value: string): string | null {
  const v = value.trim();
  if (!v) return method === "whatsapp" ? "Add your WhatsApp number" : "Add your email";
  if (method === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? null : "That email doesn't look right";
  return /^\+?[\d\s()-]{7,}$/.test(v) ? null : "That number doesn't look right";
}

export async function submitAdvisorEnquiry(input: AdvisorEnquiry): Promise<void> {
  const { data, error } = await supabase.functions.invoke("advisor-enquiry", {
    body: { tripSlug: input.tripSlug, tripName: input.tripName, method: input.method, value: input.value.trim(), source: "site" },
  });
  if (error) {
    // The function's own message (e.g. "That email doesn't look right") is
    // more useful than the transport error.
    const ctx = (error as Error & { context?: unknown }).context;
    if (typeof ctx === "string") {
      try { const p = JSON.parse(ctx) as { error?: string }; if (p.error) throw new Error(p.error); } catch (e) { if (e instanceof Error && e.message !== ctx) throw e; }
    }
    throw new Error(error.message || "Could not send that just now");
  }
  if (data?.error) throw new Error(String(data.error));
}
