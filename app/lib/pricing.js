"use strict";
// Fixed exchange rate + markup, kept server-side only so users can't see
// or tamper with the underlying USD price / markup logic.
Object.defineProperty(exports, "__esModule", { value: true });
exports.usdToNgn = void 0;
var MARKUP_MULTIPLIER = 1.7; // 50% markup on top of the converted price
function usdToNgn(usdAmount) {
    var rate = Number(process.env.USD_TO_NGN_RATE);
    if (!rate || Number.isNaN(rate)) {
        throw new Error("USD_TO_NGN_RATE is not set or invalid");
    }
    return usdAmount * rate * MARKUP_MULTIPLIER;
}
exports.usdToNgn = usdToNgn;
