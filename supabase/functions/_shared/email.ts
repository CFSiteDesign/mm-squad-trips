// Shared Resend email helper for the ALL IN — Mad Monkey app.
// Verified Resend domain: all.in.trips.madmonkeyhostels.com

import type { Summary } from "./trip-builder-crew.ts";

export const EMAIL_FROM = "ALL IN - Mad Monkey <hello@all.in.trips.madmonkeyhostels.com>";
export const EMAIL_REPLY_TO = "cs@madmonkeyhostels.com";
export const APP_URL = "https://madmonkeyhostels.com/all-in-trips";
export const SQUAD_LOGIN_URL = `${APP_URL}/squad-leader/login`;
export const SQUAD_DASHBOARD_PATH = "/squad-leader/dashboard";

// Internal ops team — gets a copy of every new booking
export const OPS_NOTIFY_EMAILS = [
  "reden@madmonkeyhostels.com",
  "adel@madmonkeyhostels.com",
  "hayley@madmonkeyhostels.com",
  "cai@madmonkeyhostels.com",
  "lexie@madmonkeyhostels.com",
  "ewan@madmonkeyhostels.com",
];

// Trip-specific CCs on ops notifications (matched by trip slug/name substring, case-insensitive)
export const TRIP_OPS_CC: Array<{ match: string; email: string }> = [
  { match: "pai", email: "benjie@madmonkeyhostels.com" },
  { match: "chiang mai", email: "benjie@madmonkeyhostels.com" },
  { match: "thailand", email: "benjie@madmonkeyhostels.com" },
  { match: "vietnam", email: "chris@madmonkeyhostels.com" },
  { match: "vietnam", email: "andrew@madmonkeyhostels.com" },
  { match: "vietnam", email: "thuyanh@madmonkeyhostels.com" },
  { match: "vietnam", email: "brock@madmonkeyhostels.com" },
  { match: "indonesia", email: "marco@madmonkeyhostels.com" },
  { match: "indonesia", email: "rade@madmonkeyhostels.com" },
  { match: "indonesia", email: "josh@madmonkeyhostels.com" },
  // Nusa Lembongan GM (Benji replaced Dimas, 19 Oct 2026)
  { match: "indonesia", email: "benji.taiaroa@madmonkeyhostels.com" },
  { match: "indonesia", email: "kylewalters@madmonkeyhostels.com" },
  { match: "cambodia", email: "adrian@madmonkeyhostels.com" },
  { match: "cambodia", email: "kassy@madmonkeyhostels.com" },
  { match: "cambodia", email: "johan@madmonkeyhostels.com" },
];

export function opsCcForTrip(tripName?: string | null, tripSlug?: string | null): string[] {
  const hay = `${tripName ?? ""} ${tripSlug ?? ""}`.toLowerCase();
  const out = new Set<string>();
  for (const { match, email } of TRIP_OPS_CC) {
    if (hay.includes(match)) out.add(email);
  }
  return Array.from(out);
}

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  cc?: string | string[];
  templateName?: string;
  metadata?: Record<string, unknown>;
};

async function logEmailSend(row: {
  template_name: string;
  recipient_email: string;
  cc: string | null;
  subject: string;
  status: string;
  provider_message_id: string | null;
  error_message: string | null;
  metadata: Record<string, unknown> | null;
}): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/email_send_log`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(row),
    });
  } catch (e) {
    console.warn("email log insert failed", e instanceof Error ? e.message : e);
  }
}

export async function sendEmail({ to, subject, html, replyTo, cc, templateName, metadata }: SendArgs): Promise<void> {
  const recipients = Array.isArray(to) ? to : [to];
  const ccList = cc ? (Array.isArray(cc) ? cc : [cc]) : undefined;
  const recipientLog = recipients.join(", ");
  const ccLog = ccList && ccList.length ? ccList.join(", ") : null;
  const tpl = templateName || "unknown";

  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("RESEND_API_KEY not set; skipping email", { to, subject });
    await logEmailSend({
      template_name: tpl, recipient_email: recipientLog, cc: ccLog, subject,
      status: "skipped", provider_message_id: null,
      error_message: "RESEND_API_KEY not set", metadata: metadata ?? null,
    });
    return;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: recipients,
        subject,
        html,
        reply_to: replyTo ?? EMAIL_REPLY_TO,
        ...(ccList && ccList.length ? { cc: ccList } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Resend send failed", res.status, body);
      await logEmailSend({
        template_name: tpl, recipient_email: recipientLog, cc: ccLog, subject,
        status: "failed", provider_message_id: null,
        error_message: `HTTP ${res.status}: ${body.slice(0, 500)}`,
        metadata: metadata ?? null,
      });
      return;
    }
    let providerId: string | null = null;
    try {
      const j = await res.json();
      providerId = (j && typeof j.id === "string") ? j.id : null;
    } catch { /* ignore */ }
    await logEmailSend({
      template_name: tpl, recipient_email: recipientLog, cc: ccLog, subject,
      status: "sent", provider_message_id: providerId,
      error_message: null, metadata: metadata ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Resend send threw", msg);
    await logEmailSend({
      template_name: tpl, recipient_email: recipientLog, cc: ccLog, subject,
      status: "failed", provider_message_id: null,
      error_message: msg, metadata: metadata ?? null,
    });
  }
}


/** A link we are willing to print in an email: plain http(s), no spaces or quotes. Anything else (a `javascript:` link, say) comes back empty and the link is left out. */
export function safeHref(u: unknown): string {
  const t = typeof u === "string" ? u.trim() : "";
  return /^https?:\/\/[^\s"'<>]+$/i.test(t) ? t : "";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function render(tpl: string, vars: Record<string, string | number | undefined | null>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    const v = vars[k];
    return v === undefined || v === null ? "" : escapeHtml(String(v));
  });
}

const LOGO = `${APP_URL}/all-in.png`;

function shell(title: string, bodyInner: string, contact = "cs@madmonkeyhostels.com"): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5efe2;font-family:Montserrat,Arial,sans-serif;color:#0a0a0a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5efe2"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:2px solid #0a0a0a;box-shadow:8px 8px 0 #0a0a0a">
<tr><td style="padding:20px 24px 0 24px" align="left">
<img src="${LOGO}" alt="Mad Monkey ALL IN" width="120" style="display:block;border:0">
</td></tr>
${bodyInner}
<tr><td style="padding:16px 24px 24px 24px;font-size:12px;color:#444;border-top:1px solid #eee">
Mad Monkey Hostels · ALL IN Trips · Questions? ${contact}
</td></tr>
</table></td></tr></table></body></html>`;
}

// ---------- Templates ----------

/** Creator-code perks block — prize draw + 2 free Loyalty nights (3-month validity). */
export function creatorPerksBlock(creatorCode?: string | null): string {
  if (!creatorCode) return "";
  // Every element carries an explicit dark colour: some clients (Apple Mail
  // dark mode) recolour inherited text to white, which is unreadable on lime.
  const D = "color:#0a0a0a";
  return `<div style="margin:18px 0;padding:16px;border:2px solid #0a0a0a;background:#ccff01;${D}">
<div style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px;${D}">🎟️ Your creator code perks</div>
<p style="margin:0 0 8px 0;font-size:14px;line-height:1.5;${D}">You booked with code <strong style="${D}">${escapeHtml(String(creatorCode))}</strong>, so:</p>
<ul style="margin:0 0 0 18px;padding:0;font-size:14px;line-height:1.6;${D}">
<li style="${D}">You're entered into our prize draw to win a <strong style="${D}">7-Day Indonesia ALL IN Trip</strong>.</li>
<li style="${D}"><strong style="${D}">2 free nights</strong> will be added to your Mad Monkey Loyalty account shortly.</li>
</ul>
<p style="margin:8px 0 0 0;font-size:12px;line-height:1.5;color:#333">Free nights are valid for <strong style="color:#333">3 months</strong> from your booking date.</p>
</div>`;
}

// The one booking confirmation every guest gets (8 Oct 2026: no minimum, so
// crews and independents both hear they're confirmed right away). Comms doc
// 16 Oct 2026: no "guaranteed to run" and nothing about flights, here or in
// the subject; guests decide on flights themselves.
// Handles deposit (balance block + pay link) and paid in full.
export function bookingConfirmedEmail(v: {
  firstName: string;
  tripCountry: string;
  tripName: string;
  departureDate: string;
  spots: number | string;
  balanceAmount: string;
  balanceDueDate: string;
  payBalanceUrl: string;
  bookingRef: string;
  bookingUrl: string;
  hasBalance: boolean;
  creatorCode?: string | null;
}): { subject: string; html: string } {
  const balanceBlock = v.hasBalance
    ? `<p style="margin:0 0 12px 0"><strong>Balance to settle:</strong></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 16px 0">
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Spots</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{spots}}</td></tr>
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Balance</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{balanceAmount}}</td></tr>
<tr><td style="padding:10px 14px"><strong>Due by</strong></td><td style="padding:10px 14px">{{balanceDueDate}} (7 days before departure)</td></tr>
</table>
<p style="margin:0 0 12px 0">Pay it anytime from now. Heads up: if you don't, we'll auto-charge the card on file 7 days before departure.</p>
<p style="margin:18px 0"><a href="{{payBalanceUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">Pay balance now</a></p>`
    : `<p style="margin:0 0 16px 0"><strong>You're paid in full, nothing left to settle 🎉</strong></p>`;

  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">You're confirmed ✅ See you in {{tripCountry}}!</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{firstName}},</p>
<p style="margin:0 0 12px 0">You're booked on <strong>{{tripName}}</strong> on <strong>{{departureDate}}</strong>. You're locked in.</p>
{{creatorPerks}}
${balanceBlock}
<p style="margin:0 0 20px 0;font-size:13px;color:#555">Booking ref: <strong>{{bookingRef}}</strong> · <a href="{{bookingUrl}}" style="color:#0a0a0a">View booking</a></p>
</td></tr>`,
    v as unknown as Record<string, string>,
    // creatorPerks is trusted server-built HTML (the code inside is escaped),
    // so it is injected after render() rather than through it.
  ).replace("{{creatorPerks}}", creatorPerksBlock(v.creatorCode));
  return {
    subject: `You're confirmed ✅ See you in ${v.tripCountry}!`,
    html: shell("You're confirmed", inner),
  };
}

// The pre-departure emails (send-departure-reminders, 6 to 4 days out).
// Fixed 6 Oct 2026 before their first ever send: the day count is real, the
// final-details HTML is spliced in after render() (render escapes every
// {{var}}, which turned the block into visible tags), and the WhatsApp box
// only shows when the trip has a verified chat.
const FINAL_DETAILS_SLOT = "%%FINAL_DETAILS%%";

function whatsappBox(url: string): string {
  if (!url) return "";
  return `<div style="margin:18px 0;padding:14px;border:2px dashed #0a0a0a;background:#f5efe2">
<div style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px">📱 Property WhatsApp</div>
<p style="margin:0 0 10px 0;font-size:14px;line-height:1.5">Save this: it's your direct line to the property crew. Use it for arrival timing, transfers or any "I'm running late" moments.</p>
<a href="${escapeHtml(url)}" style="display:inline-block;background:#25d366;color:#ffffff;font-weight:900;text-transform:uppercase;padding:10px 16px;border:2px solid #0a0a0a;text-decoration:none">Open WhatsApp</a>
</div>`;
}

const daysLabel = (n: number) => (n === 1 ? "1 day" : `${n} days`);

export function balanceReminderEmail(v: {
  firstName: string;
  tripCountry: string;
  tripName: string;
  departureDate: string;
  daysToGo: number;
  balanceAmount: string;
  payBalanceUrl: string;
  bookingRef: string;
  finalDetailsHtml: string;
  whatsappUrl: string;
}): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">{{days}} TO {{tripCountry}} 🎒</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{firstName}},</p>
<p style="margin:0 0 12px 0">Nearly there! Your <strong>{{tripName}}</strong> trip kicks off on <strong>{{departureDate}}</strong> and the countdown is on 🚨</p>

<div style="margin:18px 0;padding:16px;border:2px solid #0a0a0a;background:#ffc000">
<div style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px">💳 Balance still outstanding</div>
<p style="margin:0 0 12px 0;font-size:14px;line-height:1.5">We couldn't take your balance of <strong>{{balanceAmount}}</strong> automatically. Pay it here to lock in your spot:</p>
<p style="margin:0"><a href="{{payBalanceUrl}}" style="display:inline-block;background:#0a0a0a;color:#ccff01;font-weight:900;text-transform:uppercase;padding:12px 18px;border:2px solid #0a0a0a;text-decoration:none">Pay balance</a></p>
</div>

${FINAL_DETAILS_SLOT}
${whatsappBox(v.whatsappUrl)}

<p style="margin:0 0 20px 0;font-size:13px;color:#555">Booking ref: <strong>{{bookingRef}}</strong></p>
</td></tr>`,
    { firstName: v.firstName, tripCountry: v.tripCountry, tripName: v.tripName, departureDate: v.departureDate, days: daysLabel(v.daysToGo).toUpperCase(), balanceAmount: v.balanceAmount, payBalanceUrl: v.payBalanceUrl, bookingRef: v.bookingRef },
  ).replace(FINAL_DETAILS_SLOT, v.finalDetailsHtml); // trusted HTML, built server-side per trip slug
  return {
    subject: `${daysLabel(v.daysToGo)} to ${v.tripCountry} 🎒 Balance + final details`,
    html: shell(`${daysLabel(v.daysToGo)} to go`, inner),
  };
}

export function tripCountdownEmail(v: {
  firstName: string;
  tripCountry: string;
  tripName: string;
  departureDate: string;
  daysToGo: number;
  bookingRef: string;
  finalDetailsHtml: string;
  whatsappUrl: string;
}): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">{{days}} TO {{tripCountry}} 🎒</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{firstName}},</p>
<p style="margin:0 0 12px 0">Nearly there! Your <strong>{{tripName}}</strong> trip starts on <strong>{{departureDate}}</strong>. You're all paid up, so all that's left is packing 🎒</p>

${FINAL_DETAILS_SLOT}
${whatsappBox(v.whatsappUrl)}

<p style="margin:0 0 20px 0;font-size:13px;color:#555">Booking ref: <strong>{{bookingRef}}</strong></p>
</td></tr>`,
    { firstName: v.firstName, tripCountry: v.tripCountry, tripName: v.tripName, departureDate: v.departureDate, days: daysLabel(v.daysToGo).toUpperCase(), bookingRef: v.bookingRef },
  ).replace(FINAL_DETAILS_SLOT, v.finalDetailsHtml); // trusted HTML, built server-side per trip slug
  return {
    subject: `${daysLabel(v.daysToGo)} to ${v.tripCountry} 🎒 Final details inside`,
    html: shell(`${daysLabel(v.daysToGo)} to go`, inner),
  };
}

export function bookingOpsNotificationEmail(v: {
  leadName: string;
  leadEmail: string;
  leadPhone?: string;
  tripName: string;
  departureDate: string;
  spots: number | string;
  amount: string;
  bookingRef: string;
  squadCode?: string;
  discountCode?: string;
  staffRecommendation?: string;
  bookingUrl: string;
  /** Solo = one traveller. Group = several spots on one booking. Falls back
   *  to the spot count when a caller doesn't say. */
  bookingType?: "solo" | "group";
  /** From the gate. Decides the label only: every booking runs (no minimum since 8 Oct 2026). */
  travellerMode?: "independent" | "crew";
}): { subject: string; html: string } {
  // Ops asked (9 Sep 2026) for the type to be unmissable: it is the first
  // word of the subject, the headline, a colour block and the first row.
  const spots = Number(v.spots) || 1;
  const mode = v.travellerMode;
  const solo = mode ? mode === "independent" : v.bookingType ? v.bookingType === "solo" : String(v.spots) === "1";
  const spotsText = `${spots} spot${spots === 1 ? "" : "s"}`;
  const typeLabel = mode ? (solo ? "Independent" : "With a crew") : solo ? "Solo" : "Group";
  // No "guaranteed to run" (comms doc 16 Oct 2026): every trip runs, so it says nothing.
  const typeDetail = mode
    ? solo
      ? "1 traveller · travelling independently"
      : `${spotsText} · booked to travel with a crew`
    : solo
      ? "1 traveller"
      : `${spots} travellers booked together`;
  const heading = mode
    ? solo ? "🧍 INDEPENDENT BOOKING" : `👥 WITH A CREW · ${spotsText.toUpperCase()}`
    : solo ? "🧍 SOLO BOOKING" : `👥 GROUP BOOKING · ${spots} SPOTS`;
  const badge = `<div style="margin:0 0 16px 0;padding:14px 16px;border:3px solid #0a0a0a;background:${solo ? "#ccff01" : "#ff6600"}">
<div style="font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:.04em">${heading}</div>
<div style="font-size:13px;margin-top:4px">{{typeDetail}}</div></div>`;
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">{{headline}}</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:15px;line-height:1.5">
${badge}
<p style="margin:0 0 12px 0"><strong>{{leadName}}</strong> just booked <strong>{{tripName}}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 16px 0">
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a;background:${solo ? "#ccff01" : "#ff6600"}"><strong>Type</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a;background:${solo ? "#ccff01" : "#ff6600"}"><strong>{{typeLabel}}</strong> · {{typeDetail}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Lead</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{leadName}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Email</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{leadEmail}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Phone</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{leadPhone}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Trip</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{tripName}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Departure</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{departureDate}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Spots</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{spots}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Paid</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{amount}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Squad code</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{squadCode}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Discount</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{discountCode}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Staff rec</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{staffRecommendation}}</td></tr>
<tr><td style="padding:8px 12px"><strong>Ref</strong></td><td style="padding:8px 12px">{{bookingRef}}</td></tr>
</table>
<a href="{{bookingUrl}}" style="display:inline-block;background:#0a0a0a;color:#ccff01;font-weight:900;text-transform:uppercase;padding:12px 18px;border:2px solid #0a0a0a;text-decoration:none">View in admin</a>
</td></tr>`,
    {
      ...v,
      spots,
      typeLabel,
      typeDetail,
      headline: mode ? `NEW BOOKING · ${typeLabel.toUpperCase()} 🎒` : `NEW ${typeLabel} BOOKING 🎒`,
      leadPhone: v.leadPhone || "—",
      squadCode: v.squadCode || "—",
      discountCode: v.discountCode || "—",
      staffRecommendation: v.staffRecommendation || "—",
    } as Record<string, string | number>,
  );
  const type = mode
    ? solo ? "INDEPENDENT booking" : `WITH A CREW booking (${spotsText})`
    : solo ? "SOLO booking" : `GROUP booking (${spots} spots)`;
  return {
    subject: `${type}: ${v.leadName} · ${v.tripName} · ${v.departureDate}`,
    html: shell(`New ${typeLabel.toLowerCase()} booking`, inner),
  };
}

export function squadCreatedEmail(v: {
  leaderName: string;
  squadName: string;
  squadCode: string;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">YOUR SQUAD IS LIVE 🎉</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{leaderName}},</p>
<p style="margin:0 0 12px 0">You're officially the captain of <strong>{{squadName}}</strong>. Send this code to your crew — every booking under it counts toward your perks.</p>
<div style="margin:20px 0;padding:18px;border:2px dashed #0a0a0a;background:#ccff01;text-align:center">
<div style="font-size:12px;text-transform:uppercase;letter-spacing:.15em">Your squad code</div>
<div style="font-size:32px;font-weight:900;letter-spacing:.1em;margin-top:6px">{{squadCode}}</div>
</div>
<p style="margin:0 0 12px 0"><strong>The deal:</strong> 50% off your trip at 3 bookings · free trip at 6.</p>
<p style="margin:0 0 20px 0">Track your crew anytime from your dashboard:</p>
<a href="{{dashboardUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">Open your dashboard</a>
</td></tr>`,
    v as Record<string, string>,
  );
  return { subject: "Your squad is live 🎉", html: shell("Your squad is live", inner) };
}

export function squadMemberJoinedEmail(v: {
  leaderName: string;
  memberName: string;
  tripName: string;
  bookingsCount: number;
  toNextMilestone: string;
  nextReward: string;
  dashboardUrl: string;
  progressGoal?: number;
}): { subject: string; html: string } {
  const goal = v.progressGoal ?? 6;
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">SQUAD JUST GREW 🚀</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{leaderName}},</p>
<p style="margin:0 0 12px 0"><strong>{{memberName}}</strong> just booked <strong>{{tripName}}</strong> with your squad code.</p>
<div style="margin:16px 0;padding:14px;border:2px solid #0a0a0a;background:#ccff01">
<div style="font-size:12px;text-transform:uppercase;letter-spacing:.15em">Squad progress</div>
<div style="font-size:24px;font-weight:900;margin-top:4px">{{bookingsCount}} / {{progressGoal}} mates booked</div>
<div style="font-size:13px;margin-top:4px">{{toNextMilestone}} to go until {{nextReward}}.</div>
</div>
<a href="{{dashboardUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">Open dashboard</a>
</td></tr>`,
    { ...v, progressGoal: String(goal) } as unknown as Record<string, string>,
  );
  return { subject: `Squad just grew: ${v.bookingsCount}/${goal}`, html: shell("New squad member", inner) };
}

export function squadMilestoneEmail(v: {
  leaderName: string;
  squadCode: string;
  bookingsCount: number;
  milestoneHeadline: string;
  rewardText: string;
  nextStepText: string;
  dashboardUrl: string;
}): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">{{milestoneHeadline}} 🎉</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{leaderName}},</p>
<p style="margin:0 0 12px 0">Your squad <strong>{{squadCode}}</strong> just hit <strong>{{bookingsCount}} mates booked</strong>. That means:</p>
<div style="margin:16px 0;padding:18px;border:2px dashed #0a0a0a;background:#ffc000;text-align:center">
<div style="font-size:22px;font-weight:900;text-transform:uppercase">{{rewardText}}</div>
</div>
<p style="margin:0 0 20px 0">{{nextStepText}}</p>
<a href="{{dashboardUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">See your squad</a>
</td></tr>`,
    v as unknown as Record<string, string>,
  );
  return { subject: `${v.milestoneHeadline} 🎉`, html: shell("Milestone unlocked", inner) };
}

/**
 * Squad reward applied to the leader's own booking (_shared/squad-reward.ts):
 * money off their balance, a refund waiting for the team's check, or a refund
 * sent.
 */
export function squadRewardLeaderEmail(v: {
  leaderName: string;
  free: boolean;
  tripName: string;
  bookingRef: string;
  /** Formatted amounts; "" when that part doesn't apply. */
  cut: string;
  balanceLeft: string;
  chargeDate: string;
  refundPending: string;
  refundSent: string;
}): { subject: string; html: string } {
  const e = (s: string) => escapeHtml(s);
  const p = (t: string) => `<p style="margin:0 0 12px 0">${t}</p>`;
  const trip = `${e(v.tripName)}${v.bookingRef ? ` (${e(v.bookingRef)})` : ""}`;
  const parts: string[] = [p(`Hey ${e(v.leaderName)},`)];
  if (v.refundSent) {
    parts.push(p(`We've refunded <strong>${e(v.refundSent)}</strong> to the card you paid with for ${trip}. It usually shows within 5 to 10 working days.`));
  } else {
    parts.push(p(`Your squad reward is on your booking for ${trip}.`));
    if (v.cut) {
      parts.push(p(v.balanceLeft === "$0.00"
        ? `We've taken <strong>${e(v.cut)}</strong> off your balance, so there's nothing left to pay.`
        : `We've taken <strong>${e(v.cut)}</strong> off your balance. You now owe <strong>${e(v.balanceLeft)}</strong>, charged automatically${v.chargeDate ? ` on ${e(v.chargeDate)}` : ""}.`));
    }
    if (v.refundPending) {
      parts.push(p(`${v.cut ? "The other" : "Your"} <strong>${e(v.refundPending)}</strong> goes back to your card once our team has checked it over. We'll email you when it's on its way.`));
    }
  }
  parts.push(p("Thanks for rallying the squad."));
  const headline = v.refundSent ? "REFUND ON ITS WAY" : v.free ? "YOUR TRIP IS ON US" : "50% OFF, DONE";
  const subject = v.refundSent
    ? "Your squad reward refund is on its way"
    : v.free ? "Your squad reward: your trip is on us" : "Your squad reward: 50% off is on your booking";
  const inner = `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">${headline} 🎉</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
${parts.join("\n")}
</td></tr>`;
  return { subject, html: shell("Squad reward", inner) };
}

/** Ops note for every squad reward event (applied, approval needed, refunded, failed). */
export function squadRewardOpsEmail(v: { subject: string; body: string; adminUrl: string }): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:22px;font-weight:900;text-transform:uppercase;letter-spacing:-.01em">Squad reward</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:15px;line-height:1.5">
<p style="margin:0 0 16px 0">{{body}}</p>
<a href="{{adminUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:12px 20px;border:2px solid #0a0a0a;text-decoration:none">Open admin</a>
</td></tr>`,
    v,
  );
  return { subject: v.subject, html: shell("Squad reward", inner) };
}

export function squadPasswordResetEmail(v: {
  leaderName: string;
  squadCode: string;
  resetUrl: string;
}): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">RESET YOUR PASSWORD</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{leaderName}},</p>
<p style="margin:0 0 12px 0">Tap the button below to set a new password for squad <strong>{{squadCode}}</strong>. This link expires in 1 hour.</p>
<p style="margin:20px 0"><a href="{{resetUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">Reset password</a></p>
<p style="margin:0;font-size:13px;color:#555">Didn't ask for this? Ignore this email — your current password still works.</p>
</td></tr>`,
    v as Record<string, string>,
  );
  return { subject: "Reset your password", html: shell("Reset your password", inner) };
}

export function squadPasswordSetEmail(v: {
  leaderName: string;
  squadName: string;
  squadCode: string;
  loginUrl: string;
}): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">PASSWORD LOCKED IN 🔒</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{leaderName}},</p>
<p style="margin:0 0 12px 0">Your dashboard password for <strong>{{squadName}}</strong> ({{squadCode}}) is set. Use your squad code + password to log in anytime.</p>
<p style="margin:0 0 20px 0">If this wasn't you, reply to this email immediately.</p>
<a href="{{loginUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">Log in to dashboard</a>
</td></tr>`,
    v as Record<string, string>,
  );
  return { subject: "Password locked in 🔒", html: shell("Password set", inner) };
}

export function balancePaidEmail(v: {
  firstName: string;
  tripName: string;
  departureDate: string;
  spots: number | string;
  amountCharged: string;
  totalPaid: string;
  bookingRef: string;
  bookingUrl: string;
}): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">FINAL PAYMENT CONFIRMED ✅</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{firstName}},</p>
<p style="margin:0 0 16px 0">We've just collected the final balance for your trip — you're 100% paid up. Time to pack 🎒</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 16px 0">
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Trip</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{tripName}}</td></tr>
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Departure</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{departureDate}}</td></tr>
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Spots</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{spots}}</td></tr>
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Charged today</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{amountCharged}}</td></tr>
<tr><td style="padding:10px 14px"><strong>Total paid</strong></td><td style="padding:10px 14px">{{totalPaid}}</td></tr>
</table>
<p style="margin:0 0 20px 0">Booking ref: <strong>{{bookingRef}}</strong></p>
<a href="{{bookingUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">View booking</a>
</td></tr>`,
    v as Record<string, string>,
  );
  return { subject: "Final payment confirmed — you're all paid up ✅", html: shell("Final payment receipt", inner) };
}

export function balanceFailedEmail(v: {
  firstName: string;
  tripName: string;
  departureDate: string;
  amountDue: string;
  attempts: number;
  nextAttemptDate: string;
  bookingRef: string;
  /** /pay-balance link for this booking, so the guest can pay by hand straight away (Cai, 30 Oct 2026). */
  payBalanceUrl: string;
}): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">CARD DIDN'T GO THROUGH ⚠️</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{firstName}},</p>
<p style="margin:0 0 12px 0">We tried to charge the final balance for <strong>{{tripName}}</strong> ({{departureDate}}) and your card declined.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 16px 0">
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Amount due</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{amountDue}}</td></tr>
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Attempt</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{attempts}}</td></tr>
<tr><td style="padding:10px 14px"><strong>Next retry</strong></td><td style="padding:10px 14px">{{nextAttemptDate}}</td></tr>
</table>
<p style="margin:0 0 12px 0">Pay it now with any card using the button below. If you don't, we'll try your card again on {{nextAttemptDate}}.</p>
<p style="margin:18px 0"><a href="{{payBalanceUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">Pay balance now</a></p>
<p style="margin:0 0 16px 0">Questions? Just reply to this email.</p>
<p style="margin:0;font-size:13px;color:#555">Booking ref: <strong>{{bookingRef}}</strong></p>
</td></tr>`,
    v as unknown as Record<string, string>,
  );
  return { subject: `Action needed: final payment for ${v.tripName} declined`, html: shell("Final payment failed", inner) };
}

export function departureCancelledEmail(v: {
  firstName: string;
  tripName: string;
  departureDate: string;
  amount: string;
  tripUrl: string;
}): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">WE'RE SO SORRY — TRIP CANCELLED 💔</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{firstName}},</p>
<p style="margin:0 0 12px 0">Really gutted to share this: the <strong>{{departureDate}}</strong> departure of <strong>{{tripName}}</strong> didn't reach our 5-traveller minimum, so we've had to cancel it.</p>
<p style="margin:0 0 16px 0">Your full deposit of <strong>{{amount}}</strong> has been refunded to the card you paid with — expect it back in your account within <strong>5–10 business days</strong>.</p>
<div style="margin:18px 0;padding:16px;border:2px solid #0a0a0a;background:#ffc000">
<div style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px">Don't give up on the trip 🐒</div>
<p style="margin:0;font-size:14px;line-height:1.5">Other departures are still filling up. Grab a spot on one that's closer to going — we'd love to have you along.</p>
</div>
<p style="margin:0 0 20px 0"><a href="{{tripUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">Pick a new departure</a></p>
<p style="margin:0;font-size:14px;line-height:1.5">Any questions at all — even just to vent — reply here or email <a href="mailto:cs@madmonkeyhostels.com" style="color:#0a0a0a">cs@madmonkeyhostels.com</a>. We're on it.</p>
</td></tr>`,
    v as Record<string, string>,
  );
  return {
    subject: `Your ${v.tripName} departure didn't reach its minimum — you've been refunded`,
    html: shell("Trip cancelled — refund issued", inner),
  };
}

// Crew heads-up, 10 days out, when a departure is still under 5 travellers.
// Charlie, 6 Oct 2026: crew trips now run regardless (the 30-day auto-cancel
// is gone). Tell them early, sell them on going anyway, and offer the deposit
// back through cs@ if they'd rather not.
export function underfilledCrewNoticeEmail(v: {
  firstName: string;
  /** "14-day Vietnam" */
  tripName: string;
  /** "Vietnam": the headline and the sign-off */
  country: string;
  departureDate: string;
  bookingRef: string;
  /** Empty when there's no balance still to charge. */
  balanceDate: string;
}): { subject: string; html: string } {
  // Copy from the ALL IN comms doc (16 Oct 2026): lead with the good news.
  const flag = COUNTRY_FLAGS[v.country] ?? "";
  const balanceLine = v.balanceDate
    ? ` Please let us know before <strong>{{balanceDate}}</strong>, when your remaining balance is charged.`
    : "";
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">{{country}} is still on 🐒</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{firstName}},</p>
<p style="margin:0 0 12px 0">Good news: your <strong>{{tripName}}</strong> trip leaving <strong>{{departureDate}}</strong> is going ahead.</p>
<p style="margin:0 0 12px 0">We want to be upfront with you: your booked crew is smaller than 5 this time. But here's the thing about an ALL IN Trip: the crew you book with is only the start.</p>
<div style="margin:18px 0;padding:16px;border:2px solid #0a0a0a;background:#ffc000">
<div style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px">Your crew gets bigger every day</div>
<p style="margin:0;font-size:14px;line-height:1.5">Every night you're at a Mad Monkey hostel, where the whole point is meeting people. Family dinners, bar nights, rooftop sunsets, and tours packed with travellers going the same way you are. Most people leave with a group chat full of new mates from all over the world.</p>
</div>
<p style="margin:0 0 6px 0"><strong>What a smaller crew actually means</strong></p>
<ul style="margin:0 0 16px 0;padding-left:20px">
<li style="margin:0 0 4px 0">More say in how you spend your free time</li>
<li style="margin:0">Easier to bond fast, then bring new friends into the mix</li>
</ul>
<p style="margin:0 0 6px 0"><strong>Changed your mind?</strong></p>
<p style="margin:0 0 16px 0">No problem. Email <a href="mailto:cs@madmonkeyhostels.com" style="color:#0a0a0a">cs@madmonkeyhostels.com</a> with your booking reference <strong>{{bookingRef}}</strong> and we'll refund your deposit.${balanceLine}</p>
<p style="margin:0">See you in {{country}} {{flag}}</p>
</td></tr>`,
    { ...v, flag } as unknown as Record<string, string>,
  );
  return {
    subject: `${v.country} is still on 🐒 Your trip leaves ${v.departureDate}`,
    html: shell("Your trip is still on", inner),
  };
}

// ---------- Trip builder (Ewan's builder at /trip-builder, 19 Oct 2026) ----------
// A guest sends a trip for checking (free since 23 Oct 2026; with a deposit per person if
// TRIP_BUILDER_DEPOSIT_PER_PERSON is set); the crew checks it (the review page, or Admin >
// Trip builder) and sets the price, then the guest chooses how to pay.
// All trip builder comms go through Ewan: alerts to him, guest replies to him.

const tbButton = (href: string, label: string) =>
  `<a href="${escapeHtml(href)}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">${escapeHtml(label)}</a>`;
const tbP = (html: string) => `<p style="margin:0 0 12px 0">${html}</p>`;
// Every trip builder email points at Ewan (Charlie, 19 Oct 2026): he runs these enquiries.
export const TRIP_BUILDER_CONTACT = "ewan@madmonkeyhostels.com";
export const TRIP_BUILDER_WHATSAPP = "+44 7507 789985";
const TB_WA_LINK = "https://wa.me/447507789985";
const tbShell = (title: string, headline: string, body: string) =>
  shell(title, `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">${escapeHtml(headline)}</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
${body}
</td></tr>`, `${TRIP_BUILDER_CONTACT} · WhatsApp ${TRIP_BUILDER_WHATSAPP}`);

/** Guest: deposit paid, the trip is with the crew. */
export function tripBuilderDepositEmail(v: {
  firstName: string; ref: string; route: string; days: number; startDate: string;
  deposit: string; people: number; holdUntil: string; statusUrl: string;
}): { subject: string; html: string } {
  const e = escapeHtml;
  const body = [
    tbP(`Hey ${e(v.firstName)},`),
    tbP(`Thanks for your <strong>${e(v.deposit)}</strong> deposit${v.people > 1 ? ` (${v.people} people)` : ""}. Your trip is with the crew: <strong>${e(v.route)}</strong>, ${v.days} days${v.startDate ? `, starting ${e(v.startDate)}` : ""}.`),
    v.holdUntil ? tbP(`We're holding your beds until <strong>${e(v.holdUntil)}</strong> while a real Mad Monkey crew member checks the routes, beds, dates and prices.`) : tbP("A real Mad Monkey crew member is checking the routes, beds and prices, and will help you pin down dates."),
    tbP("Next, you'll get a confirmed plan and the final price. Your deposit comes off it. If we can't make the trip work, you get your deposit back."),
    `<p style="margin:18px 0">${tbButton(v.statusUrl, "Track my trip")}</p>`,
    tbP(`Questions? Reply to this email or message Ewan on WhatsApp: <a href="${TB_WA_LINK}" style="color:#0a0a0a">${TRIP_BUILDER_WHATSAPP}</a>.`),
    `<p style="margin:0;font-size:13px;color:#555">Reference: <strong>${e(v.ref)}</strong></p>`,
  ].join("\n");
  return { subject: `Your trip is with the crew (${v.ref})`, html: tbShell("Your trip is with the crew", "It's with the crew 🐒", body) };
}

/** Guest: a free trip is with the crew (nothing paid yet). The route is only printed when it is plain text (it is whatever the sender typed). */
export function tripBuilderReceivedEmail(v: {
  firstName: string; ref: string; route: string; days: number; startDate: string; people: number; holdUntil: string; statusUrl: string;
}): { subject: string; html: string } {
  const e = escapeHtml;
  const body = [
    tbP(`Hey ${e(v.firstName)},`),
    tbP(`Thanks for sending your trip${v.people > 1 ? ` (${v.people} people)` : ""}${v.route ? `: <strong>${e(v.route)}</strong>` : ""}, ${v.days} days${v.startDate ? `, starting ${e(v.startDate)}` : ""}. It's with the crew, and <strong>you haven't paid anything</strong>.`),
    v.holdUntil ? tbP(`We're holding your beds until <strong>${e(v.holdUntil)}</strong> while a real Mad Monkey crew member checks the routes, beds, dates and prices.`) : tbP("A real Mad Monkey crew member is checking the routes, beds and prices, and will help you pin down dates."),
    tbP("Next, you'll get a confirmed plan and the final price. Only then do you choose how to pay, and only if you say yes. If we can't make the trip work, there's nothing to pay and nothing to refund."),
    `<p style="margin:18px 0">${tbButton(v.statusUrl, "Track my trip")}</p>`,
    tbP(`Questions? Reply to this email or message Ewan on WhatsApp: <a href="${TB_WA_LINK}" style="color:#0a0a0a">${TRIP_BUILDER_WHATSAPP}</a>.`),
    `<p style="margin:0;font-size:13px;color:#555">Reference: <strong>${e(v.ref)}</strong></p>`,
  ].join("\n");
  return { subject: `Your trip is with the crew (${v.ref})`, html: tbShell("Your trip is with the crew", "It's with the crew 🐒", body) };
}

/** Ops: a new trip to check (deposit paid, or free to send). Shows the whole trip the way the guest built it, with Approve / Not approved / Edit it buttons. */
export function tripBuilderOpsEmail(v: {
  ref: string; name: string; contact: string; guestEmail: string; guestWhatsapp?: string; people: number; route: string; days: number;
  startDate: string; dates: string; estTotal: string; /** "$100" once a deposit is paid; "" when the trip was free to send. */ deposit: string; allInMatch: string; notes: string;
  itinerary: string; tripLink: string; adminUrl: string; holdUntil: string;
  /** What the builder sent (payload.summary). Null for trips sent before the summary existed: the email falls back to the plain itinerary. */
  summary?: Summary | null;
  /** Links to the crew review page, one per button. */
  reviewUrl?: string; approveUrl?: string; declineUrl?: string; editUrl?: string;
  /** "$602" – the trip cost for everyone, less the deposit if there was one. A starting figure only. */
  suggestedBalance?: string;
  /** Set when the guest has changed a trip they already sent: this email is the new version, and says what moved. */
  update?: { rev: number; changes: string[]; note: string; withdrawn: boolean; was: { route: string; days: number; total: string; start: string } };
}): { subject: string; html: string } {
  const e = escapeHtml;
  const D = "color:#0a0a0a";
  const sum = v.summary ?? null;
  const first = (v.name || "").trim().split(/\s+/)[0] || "them";
  const waDigits = (v.guestWhatsapp ?? "").replace(/\D/g, "");
  const money = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
  const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const day = (iso: string, year = false) => {
    const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00Z`) : null;
    return d ? `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}${year ? ` ${d.getUTCFullYear()}` : ""}` : "";
  };

  /* ---- the three buttons ---- */
  const actions = (v.approveUrl && v.declineUrl && v.editUrl)
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 6px 0"><tr>
<td width="34%" style="padding:0 4px 0 0"><a href="${e(v.approveUrl)}" style="display:block;background:#ccff01;${D};font-weight:900;font-size:13px;text-transform:uppercase;text-align:center;padding:14px 4px;border:2px solid #0a0a0a;text-decoration:none">Approve</a></td>
<td width="34%" style="padding:0 4px"><a href="${e(v.declineUrl)}" style="display:block;background:#ff01aa;${D};font-weight:900;font-size:13px;text-transform:uppercase;text-align:center;padding:14px 4px;border:2px solid #0a0a0a;text-decoration:none">Not approved</a></td>
<td width="32%" style="padding:0 0 0 4px"><a href="${e(v.editUrl)}" style="display:block;background:#ff6600;${D};font-weight:900;font-size:13px;text-transform:uppercase;text-align:center;padding:14px 4px;border:2px solid #0a0a0a;text-decoration:none">Edit it</a></td>
</tr></table>
<p style="margin:0 0 16px 0;font-size:12px;color:#555">Each button opens ${e(first)}'s trip exactly as they built it. Nothing is sent, charged or refunded until you confirm on that page.</p>`
    : "";

  /* ---- who ---- */
  const contactLine = waDigits.length >= 8
    ? `WhatsApp <a href="https://wa.me/${waDigits}" style="${D}">${e(v.guestWhatsapp ?? "")}</a>`
    : v.guestEmail ? `Email <a href="mailto:${e(v.guestEmail)}" style="${D}">${e(v.guestEmail)}</a>` : e(v.contact);
  const who = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 16px 0;font-size:14px;line-height:1.5"><tr><td style="padding:12px 14px">
<div style="font-size:18px;font-weight:900;${D}">${e(v.name)}</div>
<div style="${D}">${v.people > 1 ? `Party of ${v.people}` : "Travelling solo"} · ${contactLine}</div>
<div style="${D}">${v.deposit ? `Deposit paid <strong>${e(v.deposit)}</strong>` : "Free to send: <strong>nothing paid yet</strong>"}${v.holdUntil ? ` · beds held until <strong>${e(v.holdUntil)}</strong>` : " · no start date, so no beds to hold yet"}</div>
<div style="font-size:12px;color:#555">Ref ${e(v.ref)}${v.guestEmail && waDigits.length >= 8 ? ` · receipts to ${e(v.guestEmail)}` : ""}</div>
</td></tr></table>`;

  /* ---- the guest changed a trip they had already sent ---- */
  const upd = v.update;
  const banner = upd
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:3px solid #0a0a0a;background:#ff01aa;margin:0 0 16px 0"><tr><td style="padding:12px 14px;${D}">
<div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em">Updated by ${e(first)} · version ${upd.rev}</div>
<div style="font-size:16px;font-weight:900;margin:2px 0 6px 0">${e(first)} changed their plan after sending it. This replaces the version you saw before.</div>
${upd.changes.length ? `<ul style="margin:0 0 6px 18px;padding:0;font-size:13px;line-height:1.45">${upd.changes.map((c) => `<li>${e(c)}</li>`).join("")}</ul>` : ""}
<div style="font-size:12px">Before: ${e(upd.was.route || "")}${upd.was.days ? ` · ${upd.was.days} days` : ""}${upd.was.total ? ` · ${e(upd.was.total)}` : ""}${upd.was.start ? ` · from ${e(upd.was.start)}` : ""}</div>
${upd.note ? `<div style="margin-top:6px;font-size:13px">“${e(upd.note)}”</div>` : ""}
${upd.withdrawn ? `<div style="margin-top:8px;font-weight:900;font-size:13px">You had approved the earlier version. That approval and the balance are withdrawn, so nothing is waiting for ${e(first)} to pay. Approve this one when you're happy with it.</div>` : ""}
</td></tr></table>`
    : "";
  /* ---- a later stage of a journey ---- */
  const stg = sum?.stage ?? null;
  const stageBanner = stg
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:3px solid #0a0a0a;background:#00fef3;margin:0 0 16px 0"><tr><td style="padding:12px 14px;${D}">
<div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em">Stage ${stg.n} of their journey</div>
<div style="font-size:16px;font-weight:900;margin:2px 0 6px 0">${e(first)} is already travelling. Only the new stops need checking.</div>
${stg.from ? `<div style="font-size:13px">Starting from <strong>${e(stg.from.name)}</strong>${stg.arrival ? `: ${e(stg.arrival.mode)} to ${e(stg.arrival.to)} · ${e(stg.arrival.hours)} · ${money(stg.arrival.usd)}${stg.arrival.overnight ? " · overnight" : ""}` : ""}</div>` : ""}
${stg.been.length ? `<div style="font-size:13px">Already been to ${stg.been.map((x) => e(x)).join(", ")}. None of these were suggested.</div>` : ""}
${stg.parent ? `<div style="font-size:12px;margin-top:4px">The earlier stage is ${e(stg.parent)} (find it in Admin &gt; Trip builder).</div>` : ""}
</td></tr></table>`
    : "";
  const title = upd ? "Trip updated" : stg ? `Stage ${stg.n} to check` : "New trip to check";
  const subjectLead = (upd ? `UPDATED (v${upd.rev}) · ` : "") + (stg ? `Stage ${stg.n} · ` : "");

  /* ---- no summary (older trip): the plain version ---- */
  if (!sum) {
    const row = (k: string, val: string) =>
      `<tr><td style="padding:6px 10px;border-bottom:1px solid #0a0a0a;font-weight:700;white-space:nowrap">${e(k)}</td><td style="padding:6px 10px;border-bottom:1px solid #0a0a0a">${e(val || "None")}</td></tr>`;
    const body = [
      banner, actions, who,
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 16px 0;font-size:14px;border-collapse:collapse">${row("Route", v.route)}${row("Days", String(v.days))}${row("Start", v.startDate)}${row("Dates", v.dates)}${row("Builder estimate", v.estTotal)}${row("Looks like ALL IN", v.allInMatch)}${row("Notes", v.notes)}</table>`,
      `<pre style="margin:0 0 16px 0;padding:12px;border:2px solid #0a0a0a;background:#f5efe2;font-size:12px;line-height:1.45;white-space:pre-wrap;font-family:Menlo,Consolas,monospace">${e(v.itinerary)}</pre>`,
      actions,
      `<p style="margin:0 0 8px 0;font-size:13px">${safeHref(v.tripLink) ? `<a href="${e(safeHref(v.tripLink))}" style="${D}">Open the trip in the builder</a> · ` : ""}<a href="${e(v.adminUrl)}" style="${D}">Open admin</a></p>`,
    ].join("\n");
    return { subject: `${subjectLead}Trip to check: ${v.name} · ${v.route} · ${v.days} days`, html: tbShell(title, title, body) };
  }

  /* ---- at a glance ---- */
  const b = sum.budget;
  const cell = (label: string, big: string, small: string) =>
    `<td valign="top" style="padding:10px 12px;border-right:2px solid #0a0a0a"><div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#555">${e(label)}</div><div style="font-size:17px;font-weight:900;${D};line-height:1.2">${e(big)}</div><div style="font-size:12px;color:#333">${e(small)}</div></td>`;
  const glance = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 16px 0;background:#f5efe2"><tr>
${cell("Length", `${sum.days} days`, `${sum.nights} nights`)}
${cell("Stops", `${sum.stopCount}`, sum.countries.join(" + "))}
${cell("Dates", sum.start ? day(sum.start) : "Not set", sum.start ? `to ${day(sum.end, true)}${sum.datesLabel ? ` · ${sum.datesLabel.replace("Dates are ", "").replace("Dates ", "")}` : ""}` : (sum.datesLabel || "Needs dates"))}
<td valign="top" style="padding:10px 12px"><div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#555">Estimate</div><div style="font-size:17px;font-weight:900;${D};line-height:1.2">${money(b.total)}</div><div style="font-size:12px;color:#333">each${sum.people > 1 ? ` · ${money(b.totalAllPeople)} for ${sum.people}` : ""}</div></td>
</tr></table>`;

  /* ---- stop by stop ---- */
  const stopCards = sum.stops.map((s, i) => {
    const when = s.from ? `${day(s.from)} to ${day(s.to)}` : "";
    const head = s.kind === "allin"
      ? `${e(s.name)} <span style="font-weight:700">· ${s.days} days · ${money(s.usd)}</span>`
      : `${e(s.name)}${s.country ? ` <span style="font-weight:700;color:#444">· ${e(s.country)}</span>` : ""}`;
    const sub = s.kind === "allin"
      ? `${e(s.route)}`
      : `${s.nights} ${s.nights === 1 ? "night" : "nights"}${when ? ` · ${e(when)}` : ""} · bed from ${money(s.bedUsd)} a night${s.partner ? " (partner hostel, estimate)" : ""}`;
    const tours = s.tours.length
      ? s.tours.map((t) => {
        const price = t.payOnDay ? "pay on the day" : `${money(t.usd ?? 0)}${t.est ? " est." : ""}`;
        const dt = t.date ? day(t.date) : t.day ? `day ${t.day}` : "";
        return `<tr><td valign="top" style="padding:3px 0;font-size:13px;${D}">${t.fits ? "" : `<span style="background:#ffc000;padding:0 4px;font-weight:900;font-size:11px">NO ROOM</span> `}${e(t.name)}</td><td valign="top" align="right" style="padding:3px 0 3px 10px;font-size:13px;white-space:nowrap;${D}">${e(price)}${dt ? `<br><span style="font-size:11px;color:#555">${e(dt)}</span>` : ""}</td></tr>`;
      }).join("")
      : (s.kind === "allin" ? "" : `<tr><td colspan="2" style="padding:3px 0;font-size:13px;color:#777">No tours picked</td></tr>`);
    const next = s.next
      ? `<tr><td colspan="2" style="padding:8px 0 0 0"><div style="border-top:1px dashed #0a0a0a;padding-top:6px;font-size:12px;${D}"><strong>Then</strong> ${e(s.next.mode)} to ${e(s.next.to)} · ${e(s.next.hours)} · ${money(s.next.usd)}${s.next.overnight ? " · overnight" : ""}${s.next.date ? ` · ${e(day(s.next.date))}` : ""}</div></td></tr>`
      : "";
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 8px 0"><tr>
<td width="34" valign="top" align="center" style="background:#ccff01;border-right:2px solid #0a0a0a;font-weight:900;font-size:16px;${D};padding:10px 0">${i + 1}</td>
<td style="padding:10px 12px"><div style="font-size:15px;font-weight:900;text-transform:uppercase;${D}">${head}</div><div style="font-size:12px;color:#333;margin:2px 0 6px 0">${sub}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${tours}${next}</table></td></tr></table>`;
  }).join("\n");

  /* ---- the money ---- */
  const mrow = (k: string, val: string, bold = false, note = "") =>
    `<tr><td style="padding:5px 12px;font-size:13px;${bold ? "font-weight:900;" : ""}${D}">${e(k)}${note ? `<div style="font-size:11px;font-weight:400;color:#555">${e(note)}</div>` : ""}</td><td align="right" style="padding:5px 12px;font-size:13px;white-space:nowrap;${bold ? "font-weight:900;" : ""}${D}">${e(val)}</td></tr>`;
  const money2 = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 16px 0">
<tr><td colspan="2" style="background:#0a0a0a;color:#ffffff;padding:6px 12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em">The money · each person, US dollars</td></tr>
${mrow("Beds", money(b.beds))}${mrow("Tours", money(b.tours))}${mrow("Getting around", money(b.transport))}${b.allIn ? mrow("ALL IN trip", money(b.allIn)) : ""}${b.squadDiscount ? mrow("Squad discount", `-${money(-b.squadDiscount)}`) : ""}
${mrow("Trip cost", money(b.tripCost), true)}
${mrow("Their spending money", money(b.spendFund), false, `${money(b.spendPerDay)} a day for food and fun. Theirs to spend, not charged by us.`)}
${mrow("Estimated total", money(b.total), true)}
${sum.people > 1 ? mrow(`For all ${sum.people}`, `${money(b.tripCostAllPeople)} trip cost · ${money(b.totalAllPeople)} with spending money`, true) : ""}
${b.guestBudget ? mrow("Their own budget", `${money(b.guestBudget)} each`, false, b.budgetLeft == null ? "" : b.budgetLeft >= 0 ? `${money(b.budgetLeft)} to spare` : `${money(-b.budgetLeft)} over`) : ""}
<tr><td colspan="2" style="background:#ccff01;padding:8px 12px;font-size:13px;${D}">${v.deposit ? `Deposit paid <strong>${e(v.deposit)}</strong>` : "Nothing paid yet (free to send)"}${v.suggestedBalance ? ` · suggested ${v.deposit ? "balance" : "price"} <strong>${e(v.suggestedBalance)}</strong> <span style="font-size:11px">(trip cost${sum.people > 1 ? ` for ${sum.people}` : ""}${v.deposit ? " less the deposit" : ""}). You set the final figure when you approve.</span>` : ""}</td></tr>
</table>`;

  /* ---- heads up ---- */
  const flags = sum.flags.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 16px 0">
<tr><td style="background:#ffc000;padding:6px 12px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;${D}">Heads up before you decide</td></tr>
${sum.flags.map((f) => `<tr><td style="padding:6px 12px;font-size:13px;line-height:1.4;border-top:1px solid #ddd;${D}">${f.level === "warn" ? `<strong style="background:#ffc000;padding:0 5px">!</strong> ` : `<span style="color:#888">&bull;</span> `}${e(f.text)}</td></tr>`).join("")}
</table>`
    : "";

  const note = v.notes
    ? `<div style="margin:0 0 16px 0;padding:12px 14px;border:2px solid #0a0a0a;background:#f5efe2"><div style="font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#555;margin-bottom:4px">${e(first)}'s note</div><div style="font-size:14px;line-height:1.5;white-space:pre-line;${D}">${e(v.notes)}</div></div>`
    : "";

  const body = [
    banner, stageBanner, actions, who, glance,
    `<p style="margin:0 0 8px 0;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#555">The trip, stop by stop</p>`,
    stopCards, `<div style="height:8px"></div>`, money2, flags, note,
    `<p style="margin:0 0 8px 0;font-size:14px;font-weight:900;${D}">Happy with it?</p>`, actions,
    `<p style="margin:12px 0 0 0;font-size:13px;line-height:1.7">${v.reviewUrl ? `<a href="${e(v.reviewUrl)}" style="${D}">Open the review page</a> · ` : ""}${safeHref(v.tripLink) ? `<a href="${e(safeHref(v.tripLink))}" style="${D}">Open it in the builder</a> · ` : ""}<a href="${e(v.adminUrl)}" style="${D}">Admin</a></p>`,
  ].join("\n");
  return {
    subject: `${subjectLead}Trip to check: ${v.name}${v.people > 1 ? ` + ${v.people - 1}` : ""} · ${sum.headline || v.route} · ${sum.days} days${sum.start ? ` · from ${day(sum.start)}` : ""}`,
    html: tbShell(title, title, body),
  };
}

/** Guest: checked, here's the final price. The button opens their trip page, where they choose how to pay the rest. */
export function tripBuilderReadyEmail(v: {
  firstName: string; ref: string; route: string; balance: string; note: string; payUrl: string; statusUrl: string;
  /** False when nothing was paid when the trip was sent (the usual case now): it is the whole price, not "the rest". */
  hasDeposit?: boolean;
  /** The checked plan (the crew may have tweaked it), so the guest can see exactly what they're paying for. */
  planUrl?: string;
  /** What they can choose, e.g. ["Pay it all now", "Pay it automatically on Tue 12 Jan, a week before you leave", "Pay in 3 instalments"]. */
  choices?: string[];
}): { subject: string; html: string } {
  const e = escapeHtml;
  const body = [
    tbP(`Hey ${e(v.firstName)},`),
    tbP(`Good news: the crew has checked your trip, <strong>${e(v.route)}</strong>.`),
    v.note ? `<div style="margin:16px 0;padding:14px;border:2px solid #0a0a0a;background:#ccff01"><div style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px">From the crew</div><div style="font-size:15px;white-space:pre-line">${e(v.note)}</div></div>` : "",
    safeHref(v.planUrl) ? tbP(`Have a look at the plan we checked: <a href="${e(safeHref(v.planUrl))}" style="color:#0a0a0a">see your trip</a>.`) : "",
    v.hasDeposit === false
      ? tbP(`The price for your trip is <strong>${e(v.balance)}</strong>. You haven't paid anything yet. Choose how you'd like to pay below, and we'll lock in your beds.`)
      : tbP(`The rest to pay is <strong>${e(v.balance)}</strong>. Your deposit is already taken off, and it's the same card that carries on.`),
    v.choices && v.choices.length ? `<ul style="margin:0 0 12px 0;padding-left:20px">${v.choices.map((c) => `<li style="margin:0 0 4px 0">${e(c)}</li>`).join("")}</ul>` : "",
    `<p style="margin:18px 0">${tbButton(v.payUrl, "Choose how to pay")}</p>`,
    `<p style="margin:0;font-size:13px;color:#555">Want something changed first? Just reply to this email. Reference: <strong>${e(v.ref)}</strong></p>`,
  ].join("\n");
  return { subject: `Your trip is checked: choose how to pay${v.hasDeposit === false ? "" : " the rest"} (${v.ref})`, html: tbShell("Your trip is ready", "Ready for your OK", body) };
}

type PayRow = { amount: string; due: string; paid: boolean };
const tbTable = (rows: PayRow[]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 16px 0;font-size:14px;border-collapse:collapse">${rows.map((r) =>
  `<tr><td style="padding:7px 12px;border-bottom:1px solid #ddd;color:#0a0a0a">${escapeHtml(r.due)}</td><td align="right" style="padding:7px 12px;border-bottom:1px solid #ddd;color:#0a0a0a;white-space:nowrap">${escapeHtml(r.amount)}</td><td align="right" style="padding:7px 12px;border-bottom:1px solid #ddd;white-space:nowrap;font-weight:900;color:#0a0a0a">${r.paid ? "Paid" : "Due"}</td></tr>`).join("")}</table>`;

/** Guest: they have chosen how to pay and the first payment (if any) is in. Their trip is booked. */
export function tripBuilderBookedEmail(v: {
  firstName: string; ref: string; route: string; planLabel: string; /** "" when nothing was paid when the trip was sent. */ deposit: string; schedule: PayRow[]; statusUrl: string; startDate?: string;
}): { subject: string; html: string } {
  const e = escapeHtml;
  const body = [
    tbP(`Hey ${e(v.firstName)},`),
    tbP(`You're booked: <strong>${e(v.route)}</strong>${v.startDate ? `, starting ${e(v.startDate)}` : ""}. ${v.deposit ? `Your <strong>${e(v.deposit)}</strong> deposit is counted, and you've` : "You've"} chosen to ${e(v.planLabel)}.`),
    `<p style="margin:0 0 6px 0;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#555">Your payments</p>`,
    tbTable(v.schedule),
    tbP(`Payments after today are charged to the card you ${v.deposit ? "paid your deposit with" : "saved with us"}. We'll email you a few days before each one. Want to pay one sooner? Open your trip below.`),
    `<p style="margin:18px 0">${tbButton(v.statusUrl, "My trip")}</p>`,
    `<p style="margin:0;font-size:13px;color:#555">Reference: <strong>${e(v.ref)}</strong></p>`,
  ].join("\n");
  return { subject: `You're booked: ${v.route} (${v.ref})`, html: tbShell("You're booked", "You're booked", body) };
}

/** Guest: "log in" by email: a link to each trip they have sent (with their key), to change it or plan the next stage from any device. */
export function tripBuilderLoginEmail(v: {
  firstName: string; trips: { ref: string; route: string; days: number; status: string; url: string }[];
}): { subject: string; html: string } {
  const e = escapeHtml;
  const label: Record<string, string> = { submitted: "With the crew", checking: "Being checked", ready: "Ready for your OK", approved: "Booked" };
  const rows = v.trips.map((t) =>
    `<tr><td style="padding:10px 0;border-top:2px solid #0a0a0a"><div style="font-size:16px;font-weight:900;text-transform:uppercase">${e(t.route)}</div><div style="font-size:12px;color:#555">${e(t.ref)} · ${e(label[t.status] ?? "Sent")}${t.days ? ` · ${t.days} days` : ""}</div><div style="margin-top:8px">${tbButton(t.url, "Open this trip")}</div></td></tr>`
  ).join("");
  const body = [
    tbP(`Hey ${e(v.firstName)},`),
    tbP("Here's your link to carry on. From your trip you can change it, or plan your next stage once you're there. We remember where you've been, so we never suggest it twice."),
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px 0">${rows}</table>`,
    tbP("A real person checks every trip before anything is booked. Questions? Reply to this email, or ask Ewan on WhatsApp: " + `<a href="${TB_WA_LINK}" style="color:#0a0a0a">${TRIP_BUILDER_WHATSAPP}</a>.`),
    `<p style="margin:0;font-size:12px;color:#555">Didn't ask for this? You can ignore it. The link only opens your own trip.</p>`,
  ].join("\n");
  return { subject: v.trips.length > 1 ? "Your Mad Monkey trips" : `Your Mad Monkey trip: ${v.trips[0]?.route ?? ""}`, html: tbShell("Your trip link", "Your trip link", body) };
}

/** Guest: a payment comes out in a few days. */
export function tripBuilderReminderEmail(v: { firstName: string; ref: string; route: string; amount: string; due: string; statusUrl: string }): { subject: string; html: string } {
  const e = escapeHtml;
  const body = [
    tbP(`Hey ${e(v.firstName)},`),
    tbP(`A reminder that <strong>${e(v.amount)}</strong> for <strong>${e(v.route)}</strong> comes out of the card you saved with us on <strong>${e(v.due)}</strong>. There's nothing you need to do.`),
    tbP("Need to change something first? Reply to this email and we'll sort it."),
    `<p style="margin:18px 0">${tbButton(v.statusUrl, "My trip")}</p>`,
    `<p style="margin:0;font-size:13px;color:#555">Reference: <strong>${e(v.ref)}</strong></p>`,
  ].join("\n");
  return { subject: `A payment comes out on ${v.due} (${v.ref})`, html: tbShell("Payment reminder", "A payment's coming up", body) };
}

/** Guest: a scheduled payment went through. */
export function tripBuilderReceiptEmail(v: { firstName: string; ref: string; route: string; amount: string; remaining: string; nextDue: string; nextAmount: string; statusUrl: string }): { subject: string; html: string } {
  const e = escapeHtml;
  const body = [
    tbP(`Hey ${e(v.firstName)},`),
    tbP(`We've taken <strong>${e(v.amount)}</strong> for <strong>${e(v.route)}</strong>.`),
    v.nextDue ? tbP(`<strong>${e(v.remaining)}</strong> to go. The next payment, <strong>${e(v.nextAmount)}</strong>, comes out on ${e(v.nextDue)}.`) : tbP("That's everything: you're <strong>paid in full</strong>. See you out there."),
    `<p style="margin:18px 0">${tbButton(v.statusUrl, "My trip")}</p>`,
    `<p style="margin:0;font-size:13px;color:#555">Reference: <strong>${e(v.ref)}</strong></p>`,
  ].join("\n");
  return { subject: v.nextDue ? `Payment received: ${v.amount} (${v.ref})` : `You're paid in full (${v.ref})`, html: tbShell("Payment received", v.nextDue ? "Payment received" : "Paid in full", body) };
}

/** Guest: a scheduled payment didn't go through. */
export function tripBuilderPaymentFailedEmail(v: { firstName: string; ref: string; route: string; amount: string; nextTry: string; final: boolean; statusUrl: string }): { subject: string; html: string } {
  const e = escapeHtml;
  const body = [
    tbP(`Hey ${e(v.firstName)},`),
    tbP(`We tried to take <strong>${e(v.amount)}</strong> for <strong>${e(v.route)}</strong> and your bank didn't let it through.`),
    v.final ? tbP("We've tried a few times now. Please pay it below, or reply to this email so we can help, to keep your beds.") : tbP(`We'll try again on <strong>${e(v.nextTry)}</strong>. If you'd rather pay it now with a different card, you can.`),
    `<p style="margin:18px 0">${tbButton(v.statusUrl, "Pay it now")}</p>`,
    `<p style="margin:0;font-size:13px;color:#555">Reference: <strong>${e(v.ref)}</strong></p>`,
  ].join("\n");
  return { subject: `Your payment didn't go through (${v.ref})`, html: tbShell("Payment problem", "That payment didn't go through", body) };
}

/** Guest: balance paid, all booked. */
export function tripBuilderConfirmedEmail(v: { firstName: string; ref: string; route: string; paid: string; statusUrl: string }): { subject: string; html: string } {
  const e = escapeHtml;
  const body = [
    tbP(`Hey ${e(v.firstName)},`),
    tbP(`We've got your <strong>${e(v.paid)}</strong>, so you're paid in full and your beds are locked in for <strong>${e(v.route)}</strong>.`),
    tbP("The crew will be in touch with anything you need before you go."),
    `<p style="margin:18px 0">${tbButton(v.statusUrl, "My trip")}</p>`,
    `<p style="margin:0;font-size:13px;color:#555">Reference: <strong>${e(v.ref)}</strong></p>`,
  ].join("\n");
  return { subject: `You're booked: ${v.route} (${v.ref})`, html: tbShell("You're all set", "You're all set 🎉", body) };
}

/** Guest: the crew couldn't make it work; deposit refunded. */
export function tripBuilderDeclinedEmail(v: { firstName: string; ref: string; route: string; note: string; refunded: string; statusUrl: string }): { subject: string; html: string } {
  const e = escapeHtml;
  const body = [
    tbP(`Hey ${e(v.firstName)},`),
    tbP(`A crew member looked at your trip, <strong>${e(v.route)}</strong>, and couldn't make this exact version work.`),
    v.note ? `<div style="margin:16px 0;padding:14px;border:2px solid #0a0a0a;background:#ffc000"><div style="font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px">From the crew</div><div style="font-size:15px;white-space:pre-line">${e(v.note)}</div></div>` : "",
    v.refunded ? tbP(`We've refunded your <strong>${e(v.refunded)}</strong> deposit to the card you paid with. It usually shows within 5 to 10 working days.`) : "",
    tbP("Reply to this email and we'll help you find a version that works."),
    `<p style="margin:0;font-size:13px;color:#555">Reference: <strong>${e(v.ref)}</strong> · <a href="${e(v.statusUrl)}" style="color:#0a0a0a">Trip status</a></p>`,
  ].join("\n");
  return { subject: `About your trip (${v.ref})`, html: tbShell("About your trip", "About your trip", body) };
}

/** Guest: we've got your changes. The crew will check this version instead of the one sent before. */
export function tripBuilderRevisedEmail(v: { firstName: string; ref: string; route: string; days: number; changes: string[]; withdrawn: boolean; statusUrl: string }): { subject: string; html: string } {
  const e = escapeHtml;
  const body = [
    tbP(`Hey ${e(v.firstName)},`),
    tbP(`We've got your changes. The crew will check this version, <strong>${e(v.route)}</strong> (${v.days} days), instead of the one you sent before. There's nothing else for you to do.`),
    v.changes.length ? `<ul style="margin:0 0 12px 0;padding-left:20px">${v.changes.map((c) => `<li style="margin:0 0 4px 0">${e(c)}</li>`).join("")}</ul>` : "",
    v.withdrawn ? tbP("A crew member had already approved your earlier version. Because the plan has changed they'll check the new one and come back to you with the final price. Nothing is due in the meantime.") : "",
    tbP("Your beds carry on as they were. You can keep changing your trip from your trip page until it's booked."),
    `<p style="margin:18px 0">${tbButton(v.statusUrl, "Track my trip")}</p>`,
    `<p style="margin:0;font-size:13px;color:#555">Reference: <strong>${e(v.ref)}</strong></p>`,
  ].join("\n");
  return { subject: `We've got your changes (${v.ref})`, html: tbShell("Changes received", "We've got your changes", body) };
}

// Flag for the sign-off of guest emails, by trip country.
const COUNTRY_FLAGS: Record<string, string> = {
  Vietnam: "🇻🇳",
  Indonesia: "🇮🇩",
  Cambodia: "🇰🇭",
  Thailand: "🇹🇭",
  Laos: "🇱🇦",
};

/** "vietnam-7" → "Vietnam". Trip names ("ALL IN · Vietnam") don't give a clean country. */
export function countryForSlug(slug?: string | null): string {
  const first = String(slug ?? "").trim().split("-")[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : "";
}

// Property-team reminder, 7 days and 1 day before a departure. Charlie, 10 Sep
// 2026: to the country GM list, reception@, and for Vietnam the travel desks.
// The manifest is built by hand (escapeHtml per cell) because render() only
// fills scalars.
export type TeamReminderBooking = {
  ref: string;
  leadName: string;
  email: string;
  phone: string;
  spots: number;
  /** Independent / Crew from the gate; Solo / Group for older bookings. */
  type: string;
  payment: string;
  members: string;
};

export function departureTeamReminderEmail(v: {
  daysOut: number;
  tripName: string;
  tripDays: number | null;
  departureDate: string;
  departureCode?: string | null;
  travellers: number;
  bookings: TeamReminderBooking[];
  adminUrl: string;
}): { subject: string; html: string } {
  const when = v.daysOut <= 0 ? "TODAY" : v.daysOut === 1 ? "TOMORROW" : `IN ${v.daysOut} DAYS`;
  const whenLower = v.daysOut <= 0 ? "today" : v.daysOut === 1 ? "tomorrow" : `in ${v.daysOut} days`;
  const soon = v.daysOut <= 1;
  const cell = (s: string, extra = "") =>
    `<td style="padding:6px 8px;border-bottom:1px solid #0a0a0a;font-size:13px;vertical-align:top;${extra}">${escapeHtml(s)}</td>`;
  const rows = v.bookings
    .map(
      (b) =>
        `<tr>${cell(b.ref)}${cell(b.leadName)}${cell(`${b.email}${b.phone ? `\n${b.phone}` : ""}`, "white-space:pre-line")}${cell(
          `${b.spots} · ${b.type}${b.members ? `\n${b.members}` : ""}`,
          "white-space:pre-line",
        )}${cell(b.payment)}</tr>`,
    )
    .join("");
  const head = (s: string) =>
    `<th align="left" style="padding:6px 8px;border-bottom:2px solid #0a0a0a;font-size:11px;text-transform:uppercase;letter-spacing:.08em">${s}</th>`;
  const inner = `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">ALL IN DEPARTS ${escapeHtml(when)} 🎒</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:15px;line-height:1.5">
<div style="margin:0 0 16px 0;padding:14px 16px;border:3px solid #0a0a0a;background:${soon ? "#ff6600" : "#ccff01"}">
<div style="font-size:20px;font-weight:900;text-transform:uppercase;letter-spacing:.02em">${escapeHtml(v.tripName)}</div>
<div style="font-size:14px;margin-top:4px"><strong>${escapeHtml(v.departureDate)}</strong> · departs ${escapeHtml(whenLower)}${v.tripDays ? ` · ${v.tripDays}-day trip` : ""}</div>
<div style="font-size:14px;margin-top:2px"><strong>${v.travellers} traveller${v.travellers === 1 ? "" : "s"}</strong> across ${v.bookings.length} booking${v.bookings.length === 1 ? "" : "s"}${v.departureCode ? ` · ${escapeHtml(v.departureCode)}` : ""}</div>
</div>
<p style="margin:0 0 12px 0">Heads up from ALL IN: this group ${whenLower === "today" ? "arrives" : "is arriving"} ${escapeHtml(whenLower)}. Here is who is on it.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 16px 0;border-collapse:collapse">
<tr>${head("Ref")}${head("Lead")}${head("Contact")}${head("Spots")}${head("Payment")}</tr>
${rows}
</table>
<a href="${escapeHtml(v.adminUrl)}" style="display:inline-block;background:#0a0a0a;color:#ccff01;font-weight:900;text-transform:uppercase;padding:12px 18px;border:2px solid #0a0a0a;text-decoration:none">View in admin</a>
<p style="margin:16px 0 0 0;font-size:12px;color:#555">Automatic reminder, sent 7 days and 1 day before every ALL IN departure with bookings. Questions: reply to this email.</p>
</td></tr>`;
  return {
    subject: `ALL IN · ${v.tripName} departs ${when} · ${v.departureDate} · ${v.travellers} traveller${v.travellers === 1 ? "" : "s"}`,
    html: shell(`ALL IN departs ${whenLower}`, inner),
  };
}
