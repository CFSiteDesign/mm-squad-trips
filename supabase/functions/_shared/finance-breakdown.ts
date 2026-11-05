// What a trip cost and what came off it, for finance's Stripe exports (Global Finance via Lexie, 5 Nov 2026).
// A later balance charge is its own Stripe payment, so it copies these from the booking's first checkout session.
// Whole-booking amounts in USD. Pure, covered by black-friday.test.ts.

export function financeBreakdown(m: Record<string, string> | null | undefined): Record<string, string> {
  if (!m?.original_price) return {};
  const saleOff = Number(m.sale_off) || 0;
  // Sessions from before code_off existed only have the total.
  const codeOff = m.code_off ?? String(Math.max(0, (Number(m.discount_amount) || 0) - saleOff));
  return {
    original_price: m.original_price,
    sale_off: String(saleOff),
    code_off: codeOff,
    final_price: m.final_price ?? "",
    ...(m.sale ? { sale: m.sale } : {}),
    ...(m.discount_code ? { discount_code: m.discount_code } : {}),
    ...(m.creator_code ? { creator_code: m.creator_code } : {}),
  };
}
