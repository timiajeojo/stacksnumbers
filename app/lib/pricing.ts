// Fixed exchange rate + markup, kept server-side only so users can't see
// or tamper with the underlying USD price / markup logic.

const MARKUP_MULTIPLIER = 1.7; // 50% markup on top of the converted price

export function usdToNgn(usdAmount: number): number {
  const rate = Number(process.env.USD_TO_NGN_RATE);
  if (!rate || Number.isNaN(rate)) {
    throw new Error("USD_TO_NGN_RATE is not set or invalid");
  }
  return usdAmount * rate * MARKUP_MULTIPLIER;
}

// What SMSPool's USD price costs us in naira: same rate, no markup. Saved on
// every order so the admin dashboard can work out the SMSPool reserve and
// gross profit.
export function usdToNgnCost(usdAmount: number): number {
  const rate = Number(process.env.USD_TO_NGN_RATE);
  if (!rate || Number.isNaN(rate)) {
    throw new Error("USD_TO_NGN_RATE is not set or invalid");
  }
  return usdAmount * rate;
}

