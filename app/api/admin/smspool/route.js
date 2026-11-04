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
var smspool_1 = require("../../../lib/smspool");
var pricing_1 = require("../../../lib/pricing");
exports.runtime = "nodejs";
exports.dynamic = "force-dynamic";
var r2 = function (n) { return Math.round(n * 100) / 100; };
var ms = function (v) { return ((v === null || v === void 0 ? void 0 : v.toMillis) ? v.toMillis() : typeof v === "number" ? v : 0); };
// GET /api/admin/smspool → live SMSPool balance + the top-ups you've logged
function GET(req) {
    return __awaiter(this, void 0, void 0, function () {
        var balanceUsd, balanceNgn, _a, ok, data, b, _b, snap, all, err_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, requireAdmin_1.requireAdmin)(req)];
                case 1:
                    if (!(_c.sent())) {
                        return [2 /*return*/, server_1.NextResponse.json({ error: "Forbidden" }, { status: 403 })];
                    }
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 8, , 9]);
                    balanceUsd = null;
                    balanceNgn = null;
                    _c.label = 3;
                case 3:
                    _c.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, (0, smspool_1.smspoolFetch)("/request/balance", {})];
                case 4:
                    _a = _c.sent(), ok = _a.ok, data = _a.data;
                    b = Number(data === null || data === void 0 ? void 0 : data.balance);
                    if (ok && Number.isFinite(b)) {
                        balanceUsd = b;
                        balanceNgn = r2((0, pricing_1.usdToNgnCost)(b));
                    }
                    return [3 /*break*/, 6];
                case 5:
                    _b = _c.sent();
                    return [3 /*break*/, 6];
                case 6: return [4 /*yield*/, firebaseAdmin_1.adminDb.collection("smspoolTopups").get()];
                case 7:
                    snap = _c.sent();
                    all = snap.docs
                        .map(function (d) {
                        var x = d.data();
                        return { id: d.id, t: ms(x.createdAt), amount: Number(x.amount) || 0, fee: Number(x.fee) || 0, note: String(x.note || "") };
                    })
                        .sort(function (a, b) { return b.t - a.t; });
                    return [2 /*return*/, server_1.NextResponse.json({
                            balanceUsd: balanceUsd,
                            balanceNgn: balanceNgn,
                            // Set SMSPOOL_DEPOSIT_URL in Vercel to the page you use to add funds
                            depositUrl: process.env.SMSPOOL_DEPOSIT_URL || "https://www.smspool.net/",
                            totals: {
                                count: all.length,
                                funded: r2(all.reduce(function (s, x) { return s + x.amount; }, 0)),
                                fees: r2(all.reduce(function (s, x) { return s + x.fee; }, 0)),
                            },
                            topups: all.slice(0, 30),
                        })];
                case 8:
                    err_1 = _c.sent();
                    console.error("Admin smspool error:", err_1);
                    return [2 /*return*/, server_1.NextResponse.json({ error: "Couldn't load SMSPool data" }, { status: 500 })];
                case 9: return [2 /*return*/];
            }
        });
    });
}
exports.GET = GET;
