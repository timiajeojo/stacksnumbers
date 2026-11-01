"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
var server_1 = require("next/server");
var firebaseAdmin_1 = require("../../../lib/firebaseAdmin");
var verifyAuth_1 = require("../../../lib/verifyAuth");
var smspool_1 = require("../../../lib/smspool");
var firestore_1 = require("firebase-admin/firestore");
// Called by the Verifications page every ~25s for orders still "waiting".
//
// Possible outcomes for a waiting order:
//   - code arrived                       -> "received"
//   - SMSPool refunded the order         -> user's wallet refunded
//   - time ran out and no code arrived   -> user's wallet refunded
//   - anything else                      -> stays "waiting"
//
// Every outcome is applied inside ONE transaction that re-reads the order, so
// overlapping checks (two tabs, two devices, retries) can never both win:
// an order ends up received OR refunded, once, never both.
function GET(req) {
    return __awaiter(this, void 0, void 0, function () {
        var uid, rentalId, userRef, rentalRef, snap, rental, _a, ok, data_1, providerStatus_1, timedOut, outcome_1, result, err_1;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, verifyAuth_1.verifyRequestUser)(req)];
                case 1:
                    uid = _b.sent();
                    if (!uid) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Not signed in" }, { status: 401 })];
                    }
                    rentalId = req.nextUrl.searchParams.get("rentalId");
                    if (!rentalId) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "rentalId is required" }, { status: 400 })];
                    }
                    userRef = firebaseAdmin_1.adminDb.collection("users").doc(uid);
                    rentalRef = userRef.collection("rentals").doc(rentalId);
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 6, , 7]);
                    return [4 /*yield*/, rentalRef.get()];
                case 3:
                    snap = _b.sent();
                    if (!snap.exists) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Rental not found" }, { status: 404 })];
                    }
                    rental = snap.data();
                    // Only "waiting" orders can change. received / refunded / expired are final.
                    if (rental.status !== "waiting") {
                        return [2 /*return*/, server_1.NextResponse.json({ status: rental.status })];
                    }
                    return [4 /*yield*/, (0, smspool_1.smspoolFetch)("/sms/check", {
                            orderid: rentalId,
                        })];
                case 4:
                    _a = _b.sent(), ok = _a.ok, data_1 = _a.data;
                    providerStatus_1 = ok && data_1 && data_1.status !== undefined && data_1.status !== null
                        ? Number(data_1.status)
                        : null;
                    timedOut = !!rental.expiresAt && Date.now() > rental.expiresAt;
                    outcome_1 = null;
                    if (providerStatus_1 === 3) {
                        outcome_1 = "received"; // a code always wins, even right at expiry
                    }
                    else if (providerStatus_1 === 6) {
                        outcome_1 = "refunded"; // SMSPool refunded the order
                    }
                    else if (timedOut && providerStatus_1 !== null) {
                        // Time is up and SMSPool (reachable) says no code. Don't refund on a
                        // failed lookup: we couldn't rule out a code, so just try again later.
                        outcome_1 = "refunded";
                    }
                    if (!outcome_1) {
                        return [2 /*return*/, server_1.NextResponse.json({ status: "waiting" })];
                    }
                    return [4 /*yield*/, firebaseAdmin_1.adminDb.runTransaction(function (t) { return __awaiter(_this, void 0, void 0, function () {
                            var fresh, current, amount;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, t.get(rentalRef)];
                                    case 1:
                                        fresh = _a.sent();
                                        current = fresh.data();
                                        if (!current)
                                            return [2 /*return*/, { status: "waiting" }];
                                        if (current.status !== "waiting")
                                            return [2 /*return*/, { status: current.status }];
                                        if (outcome_1 === "received") {
                                            t.set(rentalRef, {
                                                status: "received",
                                                lastCode: data_1.sms || null,
                                                lastSmsText: data_1.full_sms || null,
                                                otpsReceived: firestore_1.FieldValue.increment(1),
                                            }, { merge: true });
                                            return [2 /*return*/, { status: "received" }];
                                        }
                                        amount = Number(current.costNaira) || 0;
                                        t.set(rentalRef, {
                                            status: "refunded",
                                            refundedAt: firestore_1.FieldValue.serverTimestamp(),
                                            refundReason: providerStatus_1 === 6 ? "provider_refund" : "no_code",
                                        }, { merge: true });
                                        if (amount > 0) {
                                            t.set(userRef, { walletBalance: firestore_1.FieldValue.increment(amount) }, { merge: true });
                                            // Shows up in the user's wallet history next to their other entries
                                            t.set(userRef.collection("transactions").doc("refund_".concat(rentalId)), {
                                                kind: "credit",
                                                status: "ok",
                                                method: "Refund - ".concat(current.service || "number"),
                                                amount: amount,
                                                orderId: rentalId,
                                                completed: true,
                                                createdAt: firestore_1.FieldValue.serverTimestamp(),
                                            });
                                        }
                                        return [2 /*return*/, { status: "refunded" }];
                                }
                            });
                        }); })];
                case 5:
                    result = _b.sent();
                    if (result.status === "received") {
                        return [2 /*return*/, server_1.NextResponse.json({ status: "received", code: data_1.sms })];
                    }
                    return [2 /*return*/, server_1.NextResponse.json({ status: result.status })];
                case 6:
                    err_1 = _b.sent();
                    console.error("SMSPool check error:", err_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: "Server error checking status" }, { status: 500 })];
                case 7: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
