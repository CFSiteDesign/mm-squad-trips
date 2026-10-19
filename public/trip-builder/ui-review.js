/* ============================================================
   REVIEW + HOLD — "a real person checks every trip".
   ALL IN site copy (19 Oct 2026): sending a trip for checking takes a deposit
   per person (MM_CONFIG.DEPOSIT_PER_PERSON, $50) on Stripe. The deposit holds
   the beds while the crew checks the plan and comes off the trip total; if the
   crew can't make it work it's refunded. The crew works the trip in the ALL IN
   admin (Trip builder tab) and sends the balance link from there.
     • the "Hold my beds + get it checked" modal: form -> trip-builder-request
       -> Stripe Checkout -> back to #/trip/<ref>
     • the trip status page  #/trip/<ref>  (trip-builder-status)
   With no LEAD_ENDPOINT it runs in Ewan's demo mode: nothing is sent or charged.
   ============================================================ */
(function () {
  var A = window.MMApp, MM = window.MM, C = window.MM_CONFIG || {}, u = A.util, esc = u.esc, $ = u.$;
  var per = function () { return C.DEPOSIT_PER_PERSON || 50; };
  var usd = function (n) { return '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }); };
  var STEPS = [
    { k: 'submitted', t: 'You send it', d: 'A $' + per() + ' deposit per person holds your beds and sends your plan to the crew.' },
    { k: 'checking', t: 'A human checks it', d: 'A real crew member checks the routes, beds, dates and prices.' },
    { k: 'ready', t: 'You approve', d: 'You get a confirmed plan and the final price. Change anything you like.' },
    { k: 'approved', t: 'Balance + done', d: 'Pay the rest and your beds are locked in.' }];
  var hold = function () { return C.HOLD_HOURS || 48; };
  var subs = function () { return u.store('mm-subs') || []; };
  var saveRec = function (rec) { var l = subs().filter(function (s) { return s.ref !== rec.ref; }); l.unshift(rec); u.store('mm-subs', l.slice(0, 20)); };
  function ref() { var s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', o = 'MM-'; for (var i = 0; i < 6; i++) o += s[Math.floor(Math.random() * s.length)]; return o; }
  function fmtDT(iso) { var d = new Date(iso); return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); }
  function stepsHTML(status) {
    var at = STEPS.map(function (s) { return s.k; }).indexOf(status === 'pending_payment' ? 'submitted' : status);
    return '<ol class="steps">' + STEPS.map(function (s, i) { return '<li class="' + (i < at ? 'done' : i === at ? 'now' : '') + '"><i>' + (i < at ? '✓' : i + 1) + '</i><div><b>' + s.t + '</b><span>' + s.d + '</span></div></li>'; }).join('') + '</ol>';
  }

  /* ---------- the modal ---------- */
  function open() {
    var plan = u.getPlan();
    if (!plan || !plan.totals.days) { u.toast('Add a stop first'); return; }
    var q = u.store('mm-lead') || {}, hasDate = !!A.state.start, live = !!C.LEAD_ENDPOINT;
    var sizes = [1, 2, 3, 4, 5, 6, 7, 8].map(function (n) { return '<option value="' + n + '">' + (n === 1 ? 'Just me' : n + ' of us') + '</option>'; }).join('');
    u.openModal('<div class="modal__hd"><div><div class="over">Checked by a human</div><h2 class="disp">Hold my beds.<br>Get it checked.</h2></div><button class="modal__x" data-act="close" aria-label="Close" type="button">×</button></div><div class="modal__bd">' +
      '<p style="font-weight:500">Nobody books this for you by robot. A <b>real Mad Monkey crew member</b> checks your whole trip. A <b>$' + per() + ' deposit per person</b> holds your beds while they do, and it comes off your trip total. If the crew can\'t make it work, you get it back.</p>' + stepsHTML('submitted') +
      '<form id="leadf" novalidate><div class="form2"><div class="field"><label for="lf-name">First name</label><input class="input" id="lf-name" name="name" autocomplete="given-name" required value="' + esc(q.name || '') + '"></div>' +
      u.contactPick(q) +
      '<div class="field"><label for="lf-from">Where are you now?</label><input class="input" id="lf-from" name="from" placeholder="city or country" value="' + esc(q.from || '') + '"></div>' +
      '<div class="field"><label for="lf-size">Travelling as</label><select class="select" id="lf-size" name="size">' + sizes + '</select></div>' +
      '<div class="field"><label for="lf-flex">Dates</label><select class="select" id="lf-flex" name="flex"><option value="fixed">These dates, locked</option><option value="flex">Flexible by a week or so</option><option value="open">Still deciding</option></select></div>' +
      '<div class="humans full holdbox" style="margin:0"><span>' + (hasDate ? '<b>We hold your beds for these dates</b> while the crew checks it (up to ' + hold() + ' hours).' : '<b>No start date yet</b>, so there are no nights to hold. The crew will help you pick dates.') + '</span></div>' +
      '<div class="field full"><label for="lf-notes">Anything the crew should know?</label><textarea class="input" id="lf-notes" name="notes" placeholder="budget worries, who you\'re bringing, must-dos…"></textarea></div>' +
      '<div class="full" style="display:none"><label>Leave empty <input name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<label class="chk full"><input type="checkbox" name="consent" required><span>It\'s OK for Mad Monkey to contact me about this trip. We only use your details to plan it with you.' + (C.PRIVACY_URL ? ' <a href="' + esc(C.PRIVACY_URL) + '" target="_blank" rel="noopener">Privacy</a>' : '') + '</span></label>' +
      '<div class="refbox full" style="margin:0"><span class="over">Deposit today</span><b id="lf-dep">' + usd(per()) + '</b></div></div>' +
      '<div id="leaderr" class="warn" style="display:none;margin-top:var(--s-3)"><i>!</i><span></span></div>' +
      '<div style="display:flex;gap:var(--s-2);margin-top:var(--s-4);flex-wrap:wrap"><button class="btn btn--pink" type="submit" id="lf-pay">' + (live ? 'Pay ' + usd(per()) + ' deposit' : 'Send it for checking') + '</button><button class="btn btn--ghost" data-act="close" type="button">Not yet</button></div>' +
      (live ? '<p class="fine" style="margin-top:var(--s-3)">Secure payment by Stripe. Your deposit comes off your trip total, and you only pay the rest once you\'ve approved the checked plan.</p>' : '') + '</form></div>', function (m) {
        var size = $('#lf-size', m), depEl = $('#lf-dep', m), pay = $('#lf-pay', m);
        size.addEventListener('change', function () {
          var n = +size.value || 1, total = per() * n;
          depEl.textContent = usd(total) + (n > 1 ? ' (' + n + ' × ' + usd(per()) + ')' : '');
          if (live) pay.textContent = 'Pay ' + usd(total) + ' deposit';
        });
        $('#leadf', m).addEventListener('submit', submit);
      });
  }

  function submit(e) {
    e.preventDefault(); var f = e.target, v = {}; new FormData(f).forEach(function (val, k) { v[k] = typeof val === 'string' ? val.trim() : val; });
    var err = $('#leaderr'), show = function (m) { err.style.display = 'grid'; $('span', err).textContent = m; };
    if (v.website) return;
    if (!v.name) return show('Pop your first name in.');
    var ct = u.readContact(v); if (ct.err) return show(ct.err);
    if (!v.consent) return show('Tick the box so we\'re allowed to reply.');
    u.store('mm-lead', { name: v.name, via: ct.via, email: v.email, whatsapp: v.whatsapp, from: v.from });
    var plan = u.getPlan(), wantHold = !!A.state.start, people = Math.min(8, Math.max(1, +v.size || 1));
    var payload = MM.leadPayload(A.state, plan, { name: v.name, via: ct.via, email: ct.email, whatsapp: ct.whatsapp, from: v.from || '', partySize: people, dates: v.flex, notes: v.notes || '', consent: true },
      { ref: A.meta.ref, fromHostel: A.meta.from, link: u.shareLink() });
    payload.type = 'review_request'; payload.status = 'submitted'; payload.hold = { requested: wantHold, hours: hold() };
    payload.deposit = { perPersonUsd: per(), people: people };
    u.track('review_request', { stops: plan.places.length, days: plan.totals.days, hold: wantHold });
    var btn = $('button[type=submit]', f), label = btn.textContent; btn.disabled = true; btn.textContent = C.LEAD_ENDPOINT ? 'Opening secure payment…' : 'Sending…';
    function record(data, demo) {
      var r = (data && data.ref) || ref(), now = new Date(), rec = { ref: r, createdAt: now.toISOString(), status: (data && data.status) || 'submitted', route: payload.trip.route, days: payload.trip.days, link: payload.trip.link,
        hold: wantHold ? { until: (data && data.hold && data.hold.until) || new Date(now.getTime() + hold() * 3600000).toISOString() } : null, demo: !!demo, name: v.name, email: ct.email, whatsapp: ct.whatsapp, via: ct.via,
        deposit: { amount: per() * people, paid: false }, payLink: (data && data.checkoutUrl) || '' };
      saveRec(rec); return rec;
    }
    if (!C.LEAD_ENDPOINT) return setTimeout(function () { A._lastLead = payload; success(record(null, true), payload); }, 400);
    fetch(C.LEAD_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(function (res) { return res.json().catch(function () { return {}; }).then(function (d) { if (!res.ok || !d.checkoutUrl) throw new Error(d.error || ('HTTP ' + res.status)); return d; }); })
      .then(function (data) {
        record(data, false); A._lastLead = payload;
        try { sessionStorage.setItem('mm-paying', data.ref); } catch (x) { /* private mode */ }
        window.location.href = data.checkoutUrl;
      })
      .catch(function (x) { btn.disabled = false; btn.textContent = label; show((x && x.message && x.message.indexOf('HTTP') !== 0 ? x.message + ' ' : '') + 'Nothing has been charged. Try again, or copy your plan and message the crew at ' + (C.CREW_EMAIL || 'cs@madmonkeyhostels.com') + '.'); });
  }

  // Ewan's demo-mode confirmation (no LEAD_ENDPOINT): nothing sent, nothing charged.
  function success(rec, payload) {
    var wa = C.WHATSAPP ? 'https://wa.me/' + C.WHATSAPP + '?text=' + encodeURIComponent('Hi Mad Monkey, I just sent trip ' + rec.ref + ' for checking: ' + payload.trip.route + '. ' + rec.link) : '';
    var statusUrl = u.baseUrl() + '#/trip/' + rec.ref;
    u.openModal('<div class="modal__hd"><div><div class="over">Demo mode</div><h2 class="disp">Review request ready.</h2></div><button class="modal__x" data-act="close" aria-label="Close" type="button">×</button></div><div class="modal__bd">' +
      '<div class="demo">DEMO MODE: nothing was sent, nothing was charged and no beds were held. Set <code>LEAD_ENDPOINT</code> in config.js and this takes the deposit and goes straight to the crew.</div>' +
      '<div class="refbox"><span class="over">Your reference</span><b>' + esc(rec.ref) + '</b></div>' + stepsHTML(rec.status) +
      '<div style="display:flex;gap:var(--s-2);flex-wrap:wrap"><a class="btn btn--sm" href="#/trip/' + esc(rec.ref) + '" data-act="close">Track my trip</a>' + (wa ? '<a class="btn btn--sm btn--pink" href="' + wa + '" target="_blank" rel="noopener">Message the crew on WhatsApp</a>' : '') +
      '<button class="btn btn--sm btn--paper" data-act="copylead" type="button">Copy review card</button><button class="btn btn--sm btn--ghost" data-act="close" type="button">Done</button></div><input type="hidden" id="statusurl" value="' + esc(statusUrl) + '"></div>');
  }

  /* ---------- status page ---------- */
  A.views.trip = function (r) {
    var root = document.getElementById('app'), rec = subs().filter(function (s) { return s.ref === r; })[0], polls = 0, justPaid = false;
    try { justPaid = sessionStorage.getItem('mm-paying') === r; } catch (x) { /* private mode */ }
    function paint(x, note) {
      if (!x) { root.innerHTML = '<section class="quiz"><div class="wrap"><div class="qbox"><span class="over">Trip status</span><h2 class="disp">' + (C.STATUS_ENDPOINT ? 'Looking up your trip…' : 'Can\'t find that trip.') + '</h2><p class="qhelp">' + (C.STATUS_ENDPOINT ? '' : 'We can only look up trips sent from this device. If you sent one, check your confirmation email for the reference.') + '</p><div class="qnav"><button class="btn" data-go="build" type="button">Open the builder</button></div></div></div></section>' + u.footer(); return; }
      var titles = { pending_payment: justPaid ? 'Confirming your payment…' : 'Deposit not paid yet.', submitted: 'It\'s with the crew.', checking: 'A human is checking it.', ready: 'Ready for your OK.', approved: 'You\'re all set.', declined: 'We need to tweak it.' };
      var demo = !C.LEAD_ENDPOINT || x.demo, dep = x.deposit || {}, bal = x.balance || {};
      root.innerHTML = '<section class="quiz"><div class="wrap"><div class="qbox"><span class="over">Trip ' + esc(x.ref) + '</span><h2 class="disp">' + (titles[x.status] || titles.submitted) + '</h2><p class="qhelp">' + esc(x.route) + ' · ' + x.days + ' days. Every trip is checked by a real person before you pay the balance.</p>' +
        (x.status === 'declined' ? '' : stepsHTML(x.status)) +
        (x.status === 'pending_payment' && !justPaid ? '<div class="humans" style="margin-top:0"><b>Your trip is saved.</b> Pay the ' + usd(dep.amount) + ' deposit to send it to the crew and hold your beds.</div>' : '') +
        (dep.paid && x.status !== 'declined' ? '<div class="humans" style="margin-top:0"><b>Deposit paid: ' + usd(dep.amount) + '.</b> It comes off your trip total.</div>' : '') +
        (x.status === 'declined' ? '<div class="humans" style="margin-top:0"><b>Don\'t worry.</b> A crew member couldn\'t make this exact trip work and wants to find you a better one. ' + (dep.refunded ? 'Your ' + usd(dep.amount) + ' deposit has been refunded to your card. ' : '') + (note ? '' : 'They\'ll be in touch.') + '</div>' : '') +
        (note ? '<div class="humans" style="margin-top:0"><b>From the crew:</b> ' + esc(note) + '</div>' : '') +
        (x.status === 'ready' && bal.amount ? '<div class="humans" style="margin-top:0;background:var(--lime)"><b>Balance to pay: ' + usd(bal.amount) + '.</b> Pay it to lock in your beds.</div>' : '') +
        (x.status === 'approved' && bal.paid ? '<div class="humans" style="margin-top:0;background:var(--lime)"><b>Paid in full.</b> Your beds are locked in. See you out there.</div>' : '') +
        (x.hold && (x.status === 'submitted' || x.status === 'checking') ? '<div class="humans" style="background:var(--yellow)"><b>Beds held</b> until ' + fmtDT(x.hold.until) + ' while we check it.</div>' : '') +
        '<div class="qnav"><a class="btn" href="' + esc(x.link) + '">Open my trip</a>' + (x.status === 'declined' ? '' : '<a class="btn btn--paper" href="' + esc(String(x.link).replace('#/build/', '#/pack/')) + '">Open my trip pack</a>') +
        (x.status === 'pending_payment' && x.payLink && !justPaid ? '<a class="btn btn--pink" href="' + esc(x.payLink) + '">Pay ' + usd(dep.amount) + ' deposit</a>' : '') +
        (x.status === 'ready' ? '<button class="btn btn--pink" data-act="approve" type="button">Approve + pay balance</button>' : '') + '</div>' +
        (demo ? '<div class="demo" style="margin-top:var(--s-5)">DEMO: move it along to see each state. <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' + STEPS.map(function (s) { return '<button class="chip" data-act="demostatus" data-s="' + s.k + '" type="button">' + s.t + '</button>'; }).join('') + '</div></div>' : '') +
        '</div></div></section>' + u.footer();
    }
    function fetchStatus() {
      if (!C.STATUS_ENDPOINT) return;
      fetch(C.STATUS_ENDPOINT + (C.STATUS_ENDPOINT.indexOf('?') > -1 ? '&' : '?') + 'ref=' + encodeURIComponent(r)).then(function (res) { return res.json(); }).then(function (d) {
        if (!d || !d.status) { if (!rec) root.querySelector('.disp').textContent = 'Can\'t find that trip.'; return; }
        rec = Object.assign(rec || {}, { ref: r, status: d.status, route: d.route || (rec && rec.route) || '', days: d.days || (rec && rec.days) || 0, link: d.link || (rec && rec.link) || '#/build',
          payLink: d.payLink || '', hold: d.hold ? { until: d.hold.until } : null, deposit: d.deposit || {}, balance: d.balance || {}, demo: false });
        saveRec(rec);
        if (d.status !== 'pending_payment' && justPaid) { justPaid = false; try { sessionStorage.removeItem('mm-paying'); } catch (x) { /* ignore */ } }
        // Back from Stripe before the payment webhook has landed: check again for up to 30 seconds.
        if (d.status === 'pending_payment' && justPaid && polls++ < 10) setTimeout(fetchStatus, 3000);
        else if (d.status === 'pending_payment' && justPaid) justPaid = false;
        paint(rec, d.note);
      }).catch(function () { /* keep the local view */ });
    }
    paint(rec);
    fetchStatus();
    root.addEventListener('click', function h(e) {
      var b = e.target.closest('[data-act]'); if (!b || !rec) return; var act = b.getAttribute('data-act');
      if (act === 'demostatus') { rec.status = b.getAttribute('data-s'); saveRec(rec); paint(rec, rec.status === 'ready' ? 'Everything checks out. Here\'s your confirmed plan: have a look and change what you like.' : ''); }
      if (act === 'approve') { if (rec.payLink) window.location.href = rec.payLink; else { u.toast(rec.demo || !C.LEAD_ENDPOINT ? 'Demo: the balance payment would open here' : 'The crew is sending your payment link'); } }
    });
  };

  A.review = { open: open };
})();
