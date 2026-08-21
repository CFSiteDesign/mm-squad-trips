// Squad Leader benefits, per the client's Aug 2026 asset. Single source so the
// landing page and every trip page can't drift apart.
//
// NOTE: the supplied artwork contradicts itself — the subheads say "RALLY 6
// MATES" / "RALLY 3 MATES" while the body copy underneath says "Bring 8
// friends" / "Get 4 mates signed up". Both are reproduced verbatim here rather
// than silently picking one. See the flag raised with Charlie on 18 Aug 2026.
export const SQUAD_BENEFITS = {
  free: {
    headline: "100% FREE",
    subhead: "RALLY 6 MATES",
    body: "The ultimate trip hack. Bring 8 friends on an ALL IN trip and the Squad Leader travels completely FREE.",
  },
  half: {
    headline: "50% OFF",
    subhead: "RALLY 3 MATES",
    body: "Half the crew = half the price! Get 4 mates signed up and the Squad Leader gets an instant 50% discount.",
  },
} as const;
