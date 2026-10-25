// Services that are temporarily unavailable. SMSPool now requires an approved
// whitelist application before WhatsApp numbers can be bought, so purchases
// fail until the account is approved.
//
// To re-enable WhatsApp once approved: set WHATSAPP_BLOCKED to false.
export const WHATSAPP_BLOCKED = true;

export function isBlockedService(name: string): boolean {
  return WHATSAPP_BLOCKED && /whats\s*app/i.test(name);
}
