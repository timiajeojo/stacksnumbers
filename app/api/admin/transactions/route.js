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
exports.GET = exports.dynamic = exports.runtime = void 0;
var server_1 = require("next/server");
var firebaseAdmin_1 = require("../../../lib/firebaseAdmin");
var requireAdmin_1 = require("../../../lib/requireAdmin");
exports.runtime = "nodejs";
exports.dynamic = "force-dynamic";
var DAY = 86400000;
var r2 = function (n) { return Math.round(n * 100) / 100; };
var ms = function (v) { return ((v === null || v === void 0 ? void 0 : v.toMillis) ? v.toMillis() : typeof v === "number" ? v : 0); };
// GET /api/admin/transactions?type=all|deposit|debit&days=7|30|90|all
function GET(req) {
    return __awaiter(this, void 0, void 0, function () {
        var sp, t, type, dp, days, from, _a, usersSnap, txSnap, orderSnap, people_1, orders_1, totals_1, rows_1, list, err_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, requireAdmin_1.requireAdmin)(req)];
                case 1:
                    if (!(_b.sent())) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Forbidden" }, { status: 403 })];
                    }
                    sp = req.nextUrl.searchParams;
                    t = sp.get("type");
                    type = t === "deposit" || t === "debit" ? t : "all";
                    dp = sp.get("days") || "30";
                    days = dp === "all" ? 0 : Math.max(1, Math.min(365, Number(dp) || 30));
                    from = days ? Date.now() - days * DAY : 0;
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, Promise.all([
                            firebaseAdmin_1.adminDb.collection("users").get(),
                            firebaseAdmin_1.adminDb.collectionGroup("transactions").get(),
                            firebaseAdmin_1.adminDb.collectionGroup("rentals").get(),
                        ])];
                case 3:
                    _a = _b.sent(), usersSnap = _a[0], txSnap = _a[1], orderSnap = _a[2];
                    people_1 = new Map();
                    usersSnap.forEach(function (d) {
                        var u = d.data();
                        people_1.set(d.id, { name: u.fullName || "", email: u.email || "" });
                    });
                    orders_1 = new Map();
                    orderSnap.forEach(function (d) {
                        var _a;
                        var x = d.data();
                        orders_1.set("".concat((_a = d.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id, "/").concat(d.id), {
                            status: String(x.status || ""),
                            service: String(x.service || ""),
                            t: ms(x.purchasedAt),
                        });
                    });
                    totals_1 = { deposits: 0, depositCount: 0, debits: 0, debitCount: 0, pending: 0, refunded: 0, refundedCount: 0 };
                    rows_1 = [];
                    txSnap.forEach(function (d) {
                        var _a;
                        var x = d.data();
                        var uid = ((_a = d.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id) || "";
                        var p = people_1.get(uid);
                        var who = (p === null || p === void 0 ? void 0 : p.name) || (p === null || p === void 0 ? void 0 : p.email.split("@")[0]) || "user";
                        var email = (p === null || p === void 0 ? void 0 : p.email) || "";
                        if (x.kind === "credit" && x.method === "Paystack") {
                            var time = ms(x.createdAt);
                            if (time < from)
                                return;
                            var amount = Number(x.amount) || 0;
                            totals_1.deposits += amount;
                            totals_1.depositCount++;
                            rows_1.push({ id: d.id, type: "deposit", t: time, uid: uid, who: who, email: email, amount: amount, title: "Deposit via Paystack", status: "success" });
                        }
                        else if (x.kind === "debit") {
                            var orderId = String(x.orderId || d.id.replace(/^order_/, ""));
                            var o = orders_1.get("".concat(uid, "/").concat(orderId));
                            var time = ms(x.createdAt) || (o === null || o === void 0 ? void 0 : o.t) || 0;
                            if (time < from)
                                return;
                            var amount = Number(x.amount) || 0;
                            var status = (o === null || o === void 0 ? void 0 : o.status) === "received" ? "success" : (o === null || o === void 0 ? void 0 : o.status) === "waiting" ? "pending" : (o === null || o === void 0 ? void 0 : o.status) === "refunded" ? "refunded" : "other";
                            if (status === "success") {
                                totals_1.debits += amount;
                                totals_1.debitCount++;
                            }
                            else if (status === "pending")
                                totals_1.pending += amount;
                            else if (status === "refunded") {
                                totals_1.refunded += amount;
                                totals_1.refundedCount++;
                            }
                            var service = (o === null || o === void 0 ? void 0 : o.service) || String(x.method || "").replace("Number rental - ", "");
                            rows_1.push({ id: d.id, type: "debit", t: time, uid: uid, who: who, email: email, amount: amount, title: "Number purchase \u00B7 ".concat(service || "Number"), orderId: orderId, status: status });
                        }
                    });
                    list = rows_1
                        .filter(function (r) { return type === "all" || r.type === type; })
                        .sort(function (a, b) { return b.t - a.t; });
                    return [2 /*return*/, server_1.NextResponse.json({
                            totals: {
                                deposits: r2(totals_1.deposits), depositCount: totals_1.depositCount,
                                debits: r2(totals_1.debits), debitCount: totals_1.debitCount,
                                pending: r2(totals_1.pending), refunded: r2(totals_1.refunded), refundedCount: totals_1.refundedCount,
                            },
                            matched: list.length,
                            rows: list.slice(0, 300),
                        })];
                case 4:
                    err_1 = _b.sent();
                    console.error("Admin transactions error:", err_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: "Couldn't load transactions" }, { status: 500 })];
                case 5: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
