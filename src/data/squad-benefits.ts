// Squad Leader benefits, per the client's Aug 2026 asset. Single source so the
// landing page and every trip page can't drift apart.
//
// The artwork originally contradicted itself (subheads said RALLY 6 / RALLY 3,
// body said 8 friends / 4 mates). The 25 Aug tweaks doc settles the free tier
// at 6 friends. The 50% tier still reads "4 mates" from the artwork and has
// not been restated, so it is left as supplied.
export const SQUAD_BENEFITS = {
  free: {
    headline: "100% FREE",
    subhead: "RALLY 6 MATES",
    body: "The ultimate trip hack. Bring 6 friends on an ALL IN trip and the Squad Leader travels completely FREE.",
  },
  half: {
    headline: "50% OFF",
    subhead: "RALLY 3 MATES",
    body: "Half the crew = half the price! Get 4 mates signed up and the Squad Leader gets an instant 50% discount.",
  },
} as const;
