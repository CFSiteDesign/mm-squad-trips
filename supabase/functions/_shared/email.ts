// Shared Resend email helper for the ALL IN — Mad Monkey app.
// Verified Resend domain: all.in.trips.madmonkeyhostels.com

export const EMAIL_FROM = "ALL IN - Mad Monkey <hello@all.in.trips.madmonkeyhostels.com>";
export const EMAIL_REPLY_TO = "cs@madmonkeyhostels.com";
export const APP_URL = "https://mm-squad-trips.lovable.app";
export const SQUAD_LOGIN_URL = `${APP_URL}/squad-leader/login`;
export const SQUAD_DASHBOARD_PATH = "/squad-leader/dashboard";

type SendArgs = {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
};

export async function sendEmail({ to, subject, html, replyTo }: SendArgs): Promise<void> {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) {
    console.warn("RESEND_API_KEY not set; skipping email", { to, subject });
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
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
        reply_to: replyTo ?? EMAIL_REPLY_TO,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("Resend send failed", res.status, body);
    }
  } catch (e) {
    console.error("Resend send threw", e instanceof Error ? e.message : e);
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
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">YOU'RE GOING TO {{tripCountry}} 🌴</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{firstName}},</p>
<p style="margin:0 0 16px 0">Booking locked in. Here's the rundown:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #0a0a0a;margin:0 0 16px 0">
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Trip</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{tripName}}</td></tr>
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Departure</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{departureDate}}</td></tr>
<tr><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a"><strong>Spots</strong></td><td style="padding:10px 14px;border-bottom:1px solid #0a0a0a">{{spots}}</td></tr>
<tr><td style="padding:10px 14px"><strong>Paid</strong></td><td style="padding:10px 14px">{{amount}}</td></tr>
</table>
<p style="margin:0 0 20px 0">Booking ref: <strong>{{bookingRef}}</strong></p>
<a href="{{bookingUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">View booking</a>
</td></tr>`,
    v as Record<string, string>,
  );
  return {
    subject: `You're going to ${v.tripCountry} 🌴`,
    html: shell("You're going!", inner),
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
}): { subject: string; html: string } {
  const inner = render(
    `<tr><td style="padding:16px 24px 8px 24px">
<h1 style="margin:0;font-size:28px;font-weight:900;text-transform:uppercase;letter-spacing:-.02em">SQUAD JUST GREW 🚀</h1>
</td></tr>
<tr><td style="padding:0 24px 16px 24px;font-size:16px;line-height:1.5">
<p style="margin:0 0 12px 0">Hey {{leaderName}},</p>
<p style="margin:0 0 12px 0"><strong>{{memberName}}</strong> just booked <strong>{{tripName}}</strong> with your squad code.</p>
<div style="margin:16px 0;padding:14px;border:2px solid #0a0a0a;background:#ccff01">
<div style="font-size:12px;text-transform:uppercase;letter-spacing:.15em">Squad progress</div>
<div style="font-size:24px;font-weight:900;margin-top:4px">{{bookingsCount}} / 8 bookings</div>
<div style="font-size:13px;margin-top:4px">{{toNextMilestone}} to go until {{nextReward}}.</div>
</div>
<a href="{{dashboardUrl}}" style="display:inline-block;background:#ff6600;color:#0a0a0a;font-weight:900;text-transform:uppercase;padding:14px 22px;border:2px solid #0a0a0a;text-decoration:none">Open dashboard</a>
</td></tr>`,
    v as Record<string, string>,
  );
  return { subject: `Squad just grew — ${v.bookingsCount}/8`, html: shell("New squad member", inner) };
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
