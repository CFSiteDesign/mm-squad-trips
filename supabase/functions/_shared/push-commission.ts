// Fire-and-forget trigger for push-creator-commission, so the Revenue Hub
// stays fresh after booking / balance / cancellation events. Failures are
// logged and swallowed — the nightly resync is the safety net, and the
// triggering flow (checkout, cron) must never break because of this.
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export async function triggerCommissionPush(sb: SupabaseClient): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    if (!url) return;
    const { data: secret } = await sb.rpc("get_cron_secret");
    if (typeof secret !== "string" || !secret.trim()) return;
    await fetch(`${url}/functions/v1/push-creator-commission`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-cron-secret": secret.trim() },
      body: "{}",
    }).then((r) => {
      if (!r.ok) console.warn("push-creator-commission returned", r.status);
    });
  } catch (e) {
    console.warn("push-creator-commission trigger failed:", e instanceof Error ? e.message : e);
  }
}
