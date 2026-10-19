// A sample trip for the trip builder's test send (trip-builder-test-emails): the output of the builder's crew.js
// for a 13-day Cambodia route, with no dates so it never goes stale. Regenerate it by building a trip in the builder
// and copying payload.summary / payload.crewText from a real request.
export const SAMPLE_TRIP = {
 "state": "i=s.phnom-penh.2.zue3d+q7nuc~s.koh-sdach.3.wvilf+6scy7~s.koh-rong.4.annyf+4xpxk~s.kampot.3.msfuq+xijwc&b=700",
 "route": "Phnom Penh → Koh Sdach → Koh Rong → Kampot",
 "days": 13,
 "nights": 12,
 "stops": [
  "phnom-penh",
  "koh-sdach",
  "koh-rong",
  "kampot"
 ],
 "countries": [
  "KH"
 ],
 "est": 541,
 "summary": {
  "v": 1,
  "headline": "Phnom Penh → Koh Sdach → Koh Rong → Kampot",
  "days": 13,
  "nights": 12,
  "stopCount": 4,
  "km": 396,
  "countries": [
   "Cambodia"
  ],
  "start": "",
  "end": "",
  "dates": "flex",
  "datesLabel": "Dates are flexible",
  "people": 2,
  "pref": "Smart pick",
  "crewMates": 0,
  "stops": [
   {
    "kind": "stop",
    "id": "phnom-penh",
    "name": "Phnom Penh",
    "country": "Cambodia",
    "nights": 2,
    "from": "",
    "to": "",
    "bedUsd": 7,
    "bedNights": 2,
    "bedsUsd": 14,
    "partner": false,
    "tours": [
     {
      "id": "s21-and-killing-fields-tour",
      "name": "S21 + Killing Fields",
      "usd": 32,
      "est": false,
      "payOnDay": false,
      "days": 1,
      "includesBeds": false,
      "when": "",
      "day": 1,
      "date": "",
      "fits": true
     },
     {
      "id": "sunset-boat-cruise",
      "name": "Sunset river cruise",
      "usd": 17,
      "est": false,
      "payOnDay": false,
      "days": 1,
      "includesBeds": false,
      "when": "",
      "day": 1,
      "date": "",
      "fits": true
     }
    ],
    "next": {
     "to": "Koh Sdach",
     "mode": "Boat",
     "hours": "5h30",
     "usd": 24,
     "overnight": false,
     "date": "",
     "pref": "Smart pick",
     "lastMinuteFare": null,
     "note": ""
    }
   },
   {
    "kind": "stop",
    "id": "koh-sdach",
    "name": "Koh Sdach",
    "country": "Cambodia",
    "nights": 3,
    "from": "",
    "to": "",
    "bedUsd": 9,
    "bedNights": 3,
    "bedsUsd": 27,
    "partner": false,
    "tours": [
     {
      "id": "x-koh-sdach-e-bike-island-loop",
      "name": "E-bike island loop",
      "usd": 8,
      "est": true,
      "payOnDay": false,
      "days": 1,
      "includesBeds": false,
      "when": "",
      "day": 4,
      "date": "",
      "fits": true
     },
     {
      "id": "x-koh-sdach-island-hopping-sunset-cruise",
      "name": "Island-hopping sunset cruise",
      "usd": 20,
      "est": true,
      "payOnDay": false,
      "days": 1,
      "includesBeds": false,
      "when": "",
      "day": 3,
      "date": "",
      "fits": true
     }
    ],
    "next": {
     "to": "Koh Rong",
     "mode": "Boat",
     "hours": "4h50",
     "usd": 44,
     "overnight": false,
     "date": "",
     "pref": "Smart pick",
     "lastMinuteFare": null,
     "note": ""
    }
   },
   {
    "kind": "stop",
    "id": "koh-rong",
    "name": "Koh Rong",
    "country": "Cambodia",
    "nights": 4,
    "from": "",
    "to": "",
    "bedUsd": 9,
    "bedNights": 4,
    "bedsUsd": 36,
    "partner": false,
    "tours": [
     {
      "id": "volleyball-tournament-koh-rong",
      "name": "Beach volleyball tournament",
      "usd": null,
      "est": false,
      "payOnDay": true,
      "days": 1,
      "includesBeds": false,
      "when": "Mon, Thu",
      "day": 6,
      "date": "",
      "fits": true
     },
     {
      "id": "x-koh-rong-beach-fire-show-bbq",
      "name": "Beach fire show + BBQ",
      "usd": null,
      "est": false,
      "payOnDay": true,
      "days": 1,
      "includesBeds": false,
      "when": "",
      "day": 7,
      "date": "",
      "fits": true
     }
    ],
    "next": {
     "to": "Kampot",
     "mode": "Boat + Minivan",
     "hours": "4h30",
     "usd": 21,
     "overnight": false,
     "date": "",
     "pref": "Smart pick",
     "lastMinuteFare": null,
     "note": ""
    }
   },
   {
    "kind": "stop",
    "id": "kampot",
    "name": "Kampot",
    "country": "Cambodia",
    "nights": 3,
    "from": "",
    "to": "",
    "bedUsd": 10.5,
    "bedNights": 3,
    "bedsUsd": 32,
    "partner": false,
    "tours": [
     {
      "id": "x-kampot-bokor-hill-station-day-trip",
      "name": "Bokor Hill Station day trip",
      "usd": 30,
      "est": true,
      "payOnDay": false,
      "days": 1,
      "includesBeds": false,
      "when": "",
      "day": 11,
      "date": "",
      "fits": true
     },
     {
      "id": "x-kampot-pepper-farms-salt-fields",
      "name": "Pepper farms + salt fields",
      "usd": 20,
      "est": true,
      "payOnDay": false,
      "days": 1,
      "includesBeds": false,
      "when": "",
      "day": 12,
      "date": "",
      "fits": true
     }
    ],
    "next": null
   }
  ],
  "budget": {
   "beds": 109,
   "tours": 127,
   "transport": 89,
   "allIn": 0,
   "squadDiscount": 0,
   "tripCost": 325,
   "spendPerDay": 18,
   "spendFund": 216,
   "total": 541,
   "people": 2,
   "tripCostAllPeople": 650,
   "totalAllPeople": 1082,
   "toursPaidOnTheDay": 2,
   "hasEstimates": true,
   "guestBudget": 700,
   "budgetLeft": 159
  },
  "flags": [
   {
    "level": "info",
    "text": "No start date yet. Help them pick one so the beds can be held."
   },
   {
    "level": "info",
    "text": "Close to ALL IN Cambodia (14 days, $600). Next departure Thu 22 Oct. Worth offering."
   },
   {
    "level": "info",
    "text": "2 tours are paid on the day, so not in the total."
   },
   {
    "level": "info",
    "text": "Some tour prices are estimates. Check them before quoting."
   }
  ],
  "allInMatch": {
   "id": "cambodia",
   "name": "Cambodia",
   "days": 14,
   "usd": 600,
   "nextDeparture": "2026-10-22"
  }
 },
 "crewText": "TRIP TO CHECK\nCharlie (sample) · party of 2 · from Leeds\nContact: Email ewan@madmonkeyhostels.com\n\nTHE TRIP\nPhnom Penh → Koh Sdach → Koh Rong → Kampot\n13 days · 12 nights · 4 stops · Cambodia\nDates: not decided yet\nTravel style: Smart pick\n\nSTOP BY STOP\n\n1. PHNOM PENH (Cambodia) · 2 nights\n   Bed from $7 a night\n   - S21 + Killing Fields · $32 · day 1\n   - Sunset river cruise · $17 · day 1\n   Then: Boat to Koh Sdach · 5h30 · $24\n\n2. KOH SDACH (Cambodia) · 3 nights\n   Bed from $9 a night\n   - E-bike island loop · $8 (est.) · day 4\n   - Island-hopping sunset cruise · $20 (est.) · day 3\n   Then: Boat to Koh Rong · 4h50 · $44\n\n3. KOH RONG (Cambodia) · 4 nights\n   Bed from $9 a night\n   - Beach volleyball tournament · pay on the day · day 6\n   - Beach fire show + BBQ · pay on the day · day 7\n   Then: Boat + Minivan to Kampot · 4h30 · $21\n\n4. KAMPOT (Cambodia) · 3 nights\n   Bed from $11 a night\n   - Bokor Hill Station day trip · $30 (est.) · day 11\n   - Pepper farms + salt fields · $20 (est.) · day 12\n\nMONEY (per person, US dollars)\nBeds             $109\nTours            $127\nTravel           $89\nTrip cost        $325  (x2 = $650)\nSpending money   $216 ($18 a day, their own, not charged)\nEstimated total  $541  (x2 = $1,082)\nTheir budget     $700 ($159 to spare)\n\nHEADS UP\n- No start date yet. Help them pick one so the beds can be held.\n- Close to ALL IN Cambodia (14 days, $600). Next departure Thu 22 Oct. Worth offering.\n- 2 tours are paid on the day, so not in the total.\n- Some tour prices are estimates. Check them before quoting.\n\nTHEIR NOTE\nThis is a sample trip so you can try the Approve, Not approved and Edit it buttons. Nothing here is a real booking.\n\nOPEN IT EXACTLY AS THEY BUILT IT\nhttps://madmonkeyhostels.com/all-in-trips/trip-builder/#/build/i=s.phnom-penh.2.zue3d+q7nuc~s.koh-sdach.3.wvilf+6scy7~s.koh-rong.4.annyf+4xpxk~s.kampot.3.msfuq+xijwc&b=700"
} as const;
