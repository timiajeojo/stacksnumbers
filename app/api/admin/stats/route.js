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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = exports.dynamic = exports.runtime = void 0;
var server_1 = require("next/server");
var firestore_1 = require("firebase-admin/firestore");
var firebaseAdmin_1 = require("../../../lib/firebaseAdmin");
var requireAdmin_1 = require("../../../lib/requireAdmin");
var smspool_1 = require("../../../lib/smspool");
var pricing_1 = require("../../../lib/pricing");
exports.runtime = "nodejs";
exports.dynamic = "force-dynamic";
var DAY = 86400000;
var MARKUP = pricing_1.MARKUP_MULTIPLIER; // from lib/pricing.ts; only used to estimate the cost of orders saved before we stored the real cost
var r2 = function (n) { return Math.round(n * 100) / 100; };
var sum = function (a, f) { return a.reduce(function (s, x) { return s + f(x); }, 0); };
var ms = function (v) { return ((v === null || v === void 0 ? void 0 : v.toMillis) ? v.toMillis() : typeof v === "number" ? v : 0); };
// Paystack local fee: 1.5% (+₦100 from ₦2,500), capped at ₦2,000. Only for payments saved before we stored the real fee.
var estFee = function (a) { return Math.min(a * 0.015 + (a >= 2500 ? 100 : 0), 2000); };
function GET(req) {
    return __awaiter(this, void 0, void 0, function () {
        var dp, days, now, from, _a, usersSnap, txSnap, orderSnap, topupSnap, people_1, walletTotal_1, who_1, deposits_1, orders_1, pendingHeld_1, topups_1, inWin_1, calc, cur_1, prev_1, pct, change, allDeposits, allUsed, unused, balanceUsd, balanceNgn, _b, ok, data, b, _c, span, step_1, start_1, series, activity, err_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, (0, requireAdmin_1.requireAdmin)(req)];
                case 1:
                    if (!(_d.sent())) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Forbidden" }, { status: 403 })];
                    }
                    dp = req.nextUrl.searchParams.get("days") || "30";
                    days = dp === "all" ? 0 : Math.max(1, Math.min(365, Number(dp) || 30));
                    now = Date.now();
                    from = days ? now - days * DAY : 0;
                    _d.label = 2;
                case 2:
                    _d.trys.push([2, 8, , 9]);
                    return [4 /*yield*/, Promise.all([
                            firebaseAdmin_1.adminDb.collection("users").get(),
                            firebaseAdmin_1.adminDb.collectionGroup("transactions").get(),
                            firebaseAdmin_1.adminDb.collectionGroup("rentals").get(),
                            firebaseAdmin_1.adminDb.collection("smspoolTopups").get(),
                        ])];
                case 3:
                    _a = _d.sent(), usersSnap = _a[0], txSnap = _a[1], orderSnap = _a[2], topupSnap = _a[3];
                    people_1 = new Map();
                    walletTotal_1 = 0;
                    usersSnap.forEach(function (d) {
                        var u = d.data();
                        walletTotal_1 += Number(u.walletBalance) || 0;
                        people_1.set(d.id, u.fullName || String(u.email || "").split("@")[0] || "user");
                    });
                    who_1 = function (uid) { return people_1.get(uid) || "user"; };
                    deposits_1 = [];
                    txSnap.forEach(function (d) {
                        var _a;
                        var x = d.data();
                        if (x.kind !== "credit" || x.method !== "Paystack")
                            return;
                        var amount = Number(x.amount) || 0;
                        var real = typeof x.paystackFee === "number";
                        deposits_1.push({
                            t: ms(x.createdAt),
                            amount: amount,
                            fee: real ? x.paystackFee : r2(estFee(amount)),
                            est: !real,
                            uid: ((_a = d.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id) || "",
                        });
                    });
                    orders_1 = [];
                    pendingHeld_1 = 0;
                    orderSnap.forEach(function (d) {
                        var _a;
                        var x = d.data();
                        var price = Number(x.costNaira) || 0;
                        if (x.status === "waiting")
                            pendingHeld_1 += price;
                        if (x.status !== "received")
                            return;
                        orders_1.push({
                            t: ms(x.purchasedAt),
                            price: price,
                            cost: typeof x.smspoolCostNgn === "number" ? x.smspoolCostNgn : r2(price / MARKUP),
                            uid: ((_a = d.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id) || "",
                        });
                    });
                    topups_1 = topupSnap.docs
                        .map(function (d) {
                        var x = d.data();
                        return { id: d.id, t: ms(x.createdAt), amount: Number(x.amount) || 0, fee: Number(x.fee) || 0, note: String(x.note || "") };
                    })
                        .sort(function (a, b) { return b.t - a.t; });
                    inWin_1 = function (t, a, b) { return t >= a && t < b; };
                    calc = function (a, b) {
                        var dep = deposits_1.filter(function (x) { return inWin_1(x.t, a, b); });
                        var ord = orders_1.filter(function (x) { return inWin_1(x.t, a, b); });
                        var tp = topups_1.filter(function (x) { return inWin_1(x.t, a, b); });
                        var used = sum(ord, function (x) { return x.price; });
                        var reserve = sum(ord, function (x) { return x.cost; });
                        var gross = used - reserve;
                        var fees = sum(dep, function (x) { return x.fee; }) + sum(tp, function (x) { return x.fee; });
                        return {
                            totalDeposits: r2(sum(dep, function (x) { return x.amount; })),
                            used: r2(used),
                            reserve: r2(reserve),
                            gross: r2(gross),
                            net: r2(gross - fees),
                            funding: r2(sum(tp, function (x) { return x.amount; })),
                        };
                    };
                    cur_1 = calc(from, now + 1);
                    prev_1 = days ? calc(from - days * DAY, from) : null;
                    pct = function (k) {
                        return prev_1 && prev_1[k] > 0 ? Math.round(((cur_1[k] - prev_1[k]) / prev_1[k]) * 1000) / 10 : null;
                    };
                    change = {
                        totalDeposits: pct("totalDeposits"), used: pct("used"), reserve: pct("reserve"),
                        gross: pct("gross"), net: pct("net"), funding: pct("funding"),
                    };
                    allDeposits = sum(deposits_1, function (x) { return x.amount; });
                    allUsed = sum(orders_1, function (x) { return x.price; });
                    unused = r2(allDeposits - allUsed);
                    balanceUsd = null;
                    balanceNgn = null;
                    _d.label = 4;
                case 4:
                    _d.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, (0, smspool_1.smspoolFetch)("/request/balance", {})];
                case 5:
                    _b = _d.sent(), ok = _b.ok, data = _b.data;
                    b = Number(data === null || data === void 0 ? void 0 : data.balance);
                    if (ok && Number.isFinite(b)) {
                        balanceUsd = b;
                        balanceNgn = r2((0, pricing_1.usdToNgnCost)(b));
                    }
                    return [3 /*break*/, 7];
                case 6:
                    _c = _d.sent();
                    return [3 /*break*/, 7];
                case 7:
                    span = days || 30;
                    step_1 = Math.ceil(span / 30);
                    start_1 = now - span * DAY;
                    series = Array.from({ length: Math.ceil(span / step_1) }, function (_, i) {
                        var a = start_1 + i * step_1 * DAY;
                        var b = a + step_1 * DAY;
                        var dep = deposits_1.filter(function (x) { return inWin_1(x.t, a, b); });
                        var ord = orders_1.filter(function (x) { return inWin_1(x.t, a, b); });
                        return {
                            d: new Date(a).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
                            deposits: r2(sum(dep, function (x) { return x.amount; })),
                            purchases: r2(sum(ord, function (x) { return x.price; })),
                            profit: r2(sum(ord, function (x) { return x.price - x.cost; })),
                        };
                    });
                    activity = __spreadArray(__spreadArray([], deposits_1.map(function (x) { return ({ kind: "deposit", amount: x.amount, who: who_1(x.uid), t: x.t }); }), true), orders_1.map(function (x) { return ({ kind: "purchase", amount: x.price, who: who_1(x.uid), t: x.t }); }), true).sort(function (a, b) { return b.t - a.t; }).slice(0, 8);
                    return [2 /*return*/, server_1.NextResponse.json({
                            days: dp,
                            period: cur_1,
                            change: change,
                            unused: unused,
                            lifetime: { deposits: r2(allDeposits), used: r2(allUsed) },
                            balanceNgn: balanceNgn,
                            balanceUsd: balanceUsd,
                            series: series,
                            activity: activity,
                            quick: { users: usersSnap.size, purchases: orders_1.length, transactions: txSnap.size },
                            topups: topups_1.slice(0, 6),
                            // Sanity check: unused deposits should equal what customers hold in wallets
                            walletTotal: r2(walletTotal_1),
                            pendingHeld: r2(pendingHeld_1),
                            estimatedFees: deposits_1.filter(function (x) { return x.est; }).length,
                        })];
                case 8:
                    err_1 = _d.sent();
                    console.error("Admin stats error:", err_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: "Couldn't load stats" }, { status: 500 })];
                case 9: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
// Log money you sent to SMSPool: { amount, fee, note }, both in naira.
function POST(req) {
    return __awaiter(this, void 0, void 0, function () {
        var uid, body, _a, amount, fee;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, requireAdmin_1.requireAdmin)(req)];
                case 1:
                    uid = _b.sent();
                    if (!uid)
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Forbidden" }, { status: 403 })];
                    body = {};
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, req.json()];
                case 3:
                    body = _b.sent();
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    return [3 /*break*/, 5];
                case 5:
                    amount = Number(body === null || body === void 0 ? void 0 : body.amount);
                    fee = Number((body === null || body === void 0 ? void 0 : body.fee) || 0);
                    if (!Number.isFinite(amount) || amount <= 0 || !Number.isFinite(fee) || fee < 0) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Enter a valid amount and fee" }, { status: 400 })];
                    }
                    return [4 /*yield*/, firebaseAdmin_1.adminDb.collection("smspoolTopups").add({
                            amount: amount,
                            fee: fee,
                            note: String((body === null || body === void 0 ? void 0 : body.note) || "").slice(0, 120),
                            createdBy: uid,
                            createdAt: firestore_1.FieldValue.serverTimestamp(),
                        })];
                case 6:
                    _b.sent();
                    return [2 /*return*/, server_1.NextResponse.json({ ok: true })];
            }
        });
    });
}
exports.POST = POST;
