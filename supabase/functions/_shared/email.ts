// Shared Resend email helper for the ALL IN — Mad Monkey app.
// Verified Resend domain: all.in.trips.madmonkeyhostels.com

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
  { match: "indonesia", email: "dimas@madmonkeyhostels.com" },
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

function shell(title: string, bodyInner: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f5efe2;font-family:Montserrat,Arial,sans-serif;color:#0a0a0a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5efe2"><tr><td align="center" style="padding:24px 16px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:2px solid #0a0a0a;box-shadow:8px 8px 0 #0a0a0a">
<tr><td style="padding:20px 24px 0 24px" align="left">
<img src="${LOGO}" alt="Mad Monkey — All In" width="120" style="display:block;border:0">
</td></tr>
${bodyInner}
<tr><td style="padding:16px 24px 24px 24px;font-size:12px;color:#444;border-top:1px solid #eee">
Mad Monkey Hostels — Squad Trips · Questions? cs@madmonkeyhostels.com
</td></tr>
</table></td></tr></table></body></html>`;
}

// ---------- Templates ----------

export function bookingConfirmationEmail(v: {
  firstName: string;
  tripCountry: string;
  tripName: string;
  departureDate: string;
  spots: number | string;
  amount: string;
  bookingRef: string;
  bookingUrl: string;
}): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">DEPOSIT IN. SPOT LOCKED 🔒</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{firstName}},</p>
<p style="margin:0 0 16px 0">Your deposit for <strong>{{tripName}}</strong> is in. Here's the rundown:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 16px 0">
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Trip</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{tripName}}</td></tr>
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Departure</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{departureDate}}</td></tr>
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Spots</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{spots}}</td></tr>
<tr><td style="padding:10px 14px"><strong>Deposit paid</strong></td><td style="padding:10px 14px">{{amount}}</td></tr>
</table>

<div style="margin:18px 0;padding:16px;border:2px solid #0a0a0a;background:#ffc000">
<div style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px">⚠️ Hold off on flights</div>
<p style="margin:0;font-size:14px;line-height:1.5"><strong>Don't book your flights yet.</strong> Wait for the official "Trip Confirmed" email from us before locking in dates. Trips only confirm once we hit our 5-traveller minimum.</p>
</div>

<p style="margin:0 0 12px 0"><strong>What happens next:</strong></p>
<ul style="margin:0 0 16px 18px;padding:0;font-size:14px;line-height:1.6">
<li>As soon as your departure hits 5 travellers, we'll email you the green light to book flights + the link to settle the balance.</li>
<li>If we're already inside the 30-day window before departure, we'll be in touch then either way with final details.</li>
<li>Balance is due 7 days before departure — you'll get a reminder, but you can pay it whenever once the trip is confirmed.</li>
</ul>

<p style="margin:0 0 20px 0">Booking ref: <strong>{{bookingRef}}</strong></p>
<a href="{{bookingUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">View booking</a>
</td></tr>`,
    v as Record<string, string>,
  );
  return {
    subject: `Deposit in for ${v.tripCountry} 🔒 — hold off on flights`,
    html: shell("Deposit in", inner),
  };
}

export function tripConfirmedEmail(v: {
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
}): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">TRIP CONFIRMED ✅ BOOK YOUR FLIGHTS</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{firstName}},</p>
<p style="margin:0 0 12px 0">Big news — <strong>{{tripName}}</strong> on <strong>{{departureDate}}</strong> is officially <strong>CONFIRMED</strong>. We hit the 5-traveller minimum and it's a go.</p>

<div style="margin:18px 0;padding:16px;border:2px solid #0a0a0a;background:#ccff01">
<div style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px">✈️ Green light on flights</div>
<p style="margin:0;font-size:14px;line-height:1.5">You're cleared to book. Aim to arrive the day before departure (your free pre-trip night). Reach out if you'd like a hand with anything.</p>
</div>

<p style="margin:0 0 12px 0"><strong>Balance to settle:</strong></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 16px 0">
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Spots</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{spots}}</td></tr>
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Balance</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{balanceAmount}}</td></tr>
<tr><td style="padding:10px 14px"><strong>Due by</strong></td><td style="padding:10px 14px">{{balanceDueDate}} (7 days before departure)</td></tr>
</table>

<p style="margin:0 0 12px 0">Pay it anytime from now. Heads up: if you don't, we'll auto-charge the card on file 7 days before departure.</p>

<p style="margin:18px 0"><a href="{{payBalanceUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">Pay balance now</a></p>

<p style="margin:0 0 20px 0;font-size:13px;color:#555">Booking ref: <strong>{{bookingRef}}</strong> · <a href="{{bookingUrl}}" style="color:#0a0a0a">View booking</a></p>
</td></tr>`,
    v as Record<string, string>,
  );
  return {
    subject: `${v.tripCountry} is CONFIRMED ✅ — book your flights`,
    html: shell("Trip confirmed", inner),
  };
}

export function soloBookingConfirmedEmail(v: {
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
    : `<p style="margin:0 0 16px 0"><strong>You're paid in full — nothing left to settle 🎉</strong></p>`;

  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">YOU'RE CONFIRMED ✅ BOOK YOUR FLIGHTS</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{firstName}},</p>
<p style="margin:0 0 12px 0">You booked <strong>{{tripName}}</strong> on <strong>{{departureDate}}</strong> as a <strong>solo traveller</strong> — which means it's <strong>guaranteed to run</strong>. No waiting on a minimum, no group needed. You're locked in.</p>
<div style="margin:18px 0;padding:16px;border:2px solid #0a0a0a;background:#ccff01">
<div style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px">✈️ Green light on flights</div>
<p style="margin:0;font-size:14px;line-height:1.5">Book your flights whenever you're ready — your trip is confirmed. Aim to arrive the day before departure (your free pre-trip night). Shout if you'd like a hand with anything.</p>
</div>
${balanceBlock}
<p style="margin:0 0 20px 0;font-size:13px;color:#555">Booking ref: <strong>{{bookingRef}}</strong> · <a href="{{bookingUrl}}" style="color:#0a0a0a">View booking</a></p>
</td></tr>`,
    v as unknown as Record<string, string>,
  );
  return {
    subject: `${v.tripCountry} is CONFIRMED ✅ — you're solo & good to book flights`,
    html: shell("You're confirmed", inner),
  };
}

export function balanceReminderEmail(v: {
  firstName: string;
  tripCountry: string;
  tripName: string;
  departureDate: string;
  balanceAmount: string;
  payBalanceUrl: string;
  bookingRef: string;
  finalDetailsHtml: string;
  whatsappUrl: string;
}): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">7 DAYS TO {{tripCountry}} 🎒</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{firstName}},</p>
<p style="margin:0 0 12px 0">One week. <strong>{{tripName}}</strong> kicks off on <strong>{{departureDate}}</strong> and the countdown is on 🚨</p>

<div style="margin:18px 0;padding:16px;border:2px solid #0a0a0a;background:#ffc000">
<div style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px">💳 Balance still outstanding</div>
<p style="margin:0 0 12px 0;font-size:14px;line-height:1.5">Balance of <strong>{{balanceAmount}}</strong> is due now. Settle it before we auto-charge your card on file:</p>
<p style="margin:0"><a href="{{payBalanceUrl}}" style="display:inline-block;background:#0a0a0a;color:#ccff01;font-weight:900;text-transform:uppercase;padding:12px 18px;border:2px solid #0a0a0a;text-decoration:none">Pay balance</a></p>
</div>

${"{{finalDetailsHtml}}"}

<div style="margin:18px 0;padding:14px;border:2px dashed #0a0a0a;background:#f5efe2">
<div style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px">📱 Property WhatsApp</div>
<p style="margin:0 0 10px 0;font-size:14px;line-height:1.5">Save this — direct line to the property crew. Use it for arrival timing, transfers or any "I'm running late" moments.</p>
<a href="{{whatsappUrl}}" style="display:inline-block;background:#25d366;color:#ffffff;font-weight:900;text-transform:uppercase;padding:10px 16px;border:2px solid #0a0a0a;text-decoration:none">Open WhatsApp</a>
</div>

<p style="margin:0 0 20px 0;font-size:13px;color:#555">Booking ref: <strong>{{bookingRef}}</strong></p>
</td></tr>`,
    { ...v } as Record<string, string>,
  )
    // finalDetailsHtml is raw HTML, intentionally not escaped (controlled server-side per trip slug)
    .replace("{{finalDetailsHtml}}", v.finalDetailsHtml);
  return {
    subject: `7 days to ${v.tripCountry} 🎒 — balance + final details`,
    html: shell("7 days to go", inner),
  };
}

export function tripCountdownEmail(v: {
  firstName: string;
  tripCountry: string;
  tripName: string;
  departureDate: string;
  bookingRef: string;
  finalDetailsHtml: string;
  whatsappUrl: string;
}): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">7 DAYS TO {{tripCountry}} 🎒</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{firstName}},</p>
<p style="margin:0 0 12px 0">One week until <strong>{{tripName}}</strong> on <strong>{{departureDate}}</strong>. You're paid in full — all that's left is packing 🎒</p>

${"{{finalDetailsHtml}}"}

<div style="margin:18px 0;padding:14px;border:2px dashed #0a0a0a;background:#f5efe2">
<div style="font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;margin-bottom:6px">📱 Property WhatsApp</div>
<p style="margin:0 0 10px 0;font-size:14px;line-height:1.5">Save this — direct line to the property crew. Use it for arrival timing, transfers or any "I'm running late" moments.</p>
<a href="{{whatsappUrl}}" style="display:inline-block;background:#25d366;color:#ffffff;font-weight:900;text-transform:uppercase;padding:10px 16px;border:2px solid #0a0a0a;text-decoration:none">Open WhatsApp</a>
</div>

<p style="margin:0 0 20px 0;font-size:13px;color:#555">Booking ref: <strong>{{bookingRef}}</strong></p>
</td></tr>`,
    { ...v } as Record<string, string>,
  ).replace("{{finalDetailsHtml}}", v.finalDetailsHtml);
  return {
    subject: `7 days to ${v.tripCountry} 🎒 — final details inside`,
    html: shell("7 days to go", inner),
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
  bookingUrl: string;
}): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:24px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">NEW BOOKING 🎒</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:15px;line-height:1.5">
<p style="margin:0 0 12px 0"><strong>{{leadName}}</strong> just booked <strong>{{tripName}}</strong>.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 16px 0">
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Lead</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{leadName}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Email</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{leadEmail}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Phone</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{leadPhone}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Trip</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{tripName}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Departure</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{departureDate}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Spots</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{spots}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Paid</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{amount}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Squad code</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{squadCode}}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a"><strong>Discount</strong></td><td style="padding:8px 12px;border-bottom:1px solid #0a0a0a">{{discountCode}}</td></tr>
<tr><td style="padding:8px 12px"><strong>Ref</strong></td><td style="padding:8px 12px">{{bookingRef}}</td></tr>
</table>
<a href="{{bookingUrl}}" style="display:inline-block;background:#0a0a0a;color:#ccff01;font-weight:900;text-transform:uppercase;padding:12px 18px;border:2px solid #0a0a0a;text-decoration:none">View in admin</a>
</td></tr>`,
    {
      ...v,
      leadPhone: v.leadPhone || "—",
      squadCode: v.squadCode || "—",
      discountCode: v.discountCode || "—",
    } as Record<string, string>,
  );
  return {
    subject: `New booking: ${v.leadName} — ${v.tripName} (${v.spots} spot${String(v.spots) === "1" ? "" : "s"})`,
    html: shell("New booking", inner),
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
<p style="margin:0 0 12px 0"><strong>The deal:</strong> 50% off your trip at 4 bookings · free trip at 8.</p>
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
  const goal = v.progressGoal ?? 8;
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">SQUAD JUST GREW 🚀</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{leaderName}},</p>
<p style="margin:0 0 12px 0"><strong>{{memberName}}</strong> just booked <strong>{{tripName}}</strong> with your squad code.</p>
<div style="margin:16px 0;padding:14px;border:2px solid #0a0a0a;background:#ccff01">
<div style="font-size:12px;text-transform:uppercase;letter-spacing:.15em">Squad progress</div>
<div style="font-size:24px;font-weight:900;margin-top:4px">{{bookingsCount}} / {{progressGoal}} bookings</div>
<div style="font-size:13px;margin-top:4px">{{toNextMilestone}} to go until {{nextReward}}.</div>
</div>
<a href="{{dashboardUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">Open dashboard</a>
</td></tr>`,
    { ...v, progressGoal: String(goal) } as Record<string, string>,
  );
  return { subject: `Squad just grew — ${v.bookingsCount}/${goal}`, html: shell("New squad member", inner) };
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
<p style="margin:0 0 12px 0">Your squad <strong>{{squadCode}}</strong> just hit <strong>{{bookingsCount}} bookings</strong>. That means:</p>
<div style="margin:16px 0;padding:18px;border:2px dashed #0a0a0a;background:#ffc000;text-align:center">
<div style="font-size:22px;font-weight:900;text-transform:uppercase">{{rewardText}}</div>
</div>
<p style="margin:0 0 20px 0">{{nextStepText}}</p>
<a href="{{dashboardUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">Claim it</a>
</td></tr>`,
    v as Record<string, string>,
  );
  return { subject: `${v.milestoneHeadline} 🎉`, html: shell("Milestone unlocked", inner) };
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
<p style="margin:0 0 16px 0">We'll retry automatically in 2 days. If you'd like to update the card on file or settle this manually before then, just reply to this email and we'll send you a new payment link.</p>
<p style="margin:0;font-size:13px;color:#555">Booking ref: <strong>{{bookingRef}}</strong></p>
</td></tr>`,
    v as Record<string, string>,
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
