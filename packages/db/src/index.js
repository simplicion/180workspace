"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCompanyPrisma = exports.prisma = exports.basePrisma = exports.queryMetricsStorage = void 0;
var index_js_1 = require("../generated/client/index.js");
var async_hooks_1 = require("async_hooks");
exports.queryMetricsStorage = new async_hooks_1.AsyncLocalStorage();
// Global singleton to prevent connection exhaustion in dev
var globalForPrisma = globalThis;
/**
 * Environment-aware Prisma log levels.
 * - Production: only 'error' and 'warn' — never log raw SQL.
 * - Development: 'error' + 'warn', plus 'query' when PRISMA_QUERY_LOGGING=true.
 */
function getPrismaLogLevels() {
    var levels = ['error', 'warn'];
    if (process.env.NODE_ENV !== 'production' && process.env.PRISMA_QUERY_LOGGING === 'true') {
        levels.push('query');
    }
    return levels;
}
exports.basePrisma = (_a = globalForPrisma.prisma) !== null && _a !== void 0 ? _a : new index_js_1.PrismaClient({
    log: getPrismaLogLevels(),
});
exports.prisma = exports.basePrisma.$extends({
    query: {
        $allModels: {
            $allOperations: function (_a) {
                return __awaiter(this, arguments, void 0, function (_b) {
                    var startTime, result, executionTime, perfData;
                    var model = _b.model, operation = _b.operation, args = _b.args, query = _b.query;
                    return __generator(this, function (_c) {
                        switch (_c.label) {
                            case 0:
                                startTime = Date.now();
                                return [4 /*yield*/, query(args)];
                            case 1:
                                result = _c.sent();
                                executionTime = Date.now() - startTime;
                                if (executionTime > 200) {
                                    console.warn("[Prisma Profiler - SLOW QUERY (GLOBAL)] Model: ".concat(model, ", Operation: ").concat(operation, ", Time: ").concat(executionTime, "ms"));
                                }
                                else if (process.env.PRISMA_PROFILER_LOG === 'true') {
                                    console.log("[Prisma Profiler (GLOBAL)] Model: ".concat(model, ", Operation: ").concat(operation, ", Time: ").concat(executionTime, "ms"));
                                }
                                perfData = exports.queryMetricsStorage.getStore();
                                if (perfData) {
                                    perfData.numberOfQueries = (perfData.numberOfQueries || 0) + 1;
                                    perfData.databaseDuration = (perfData.databaseDuration || 0) + executionTime;
                                    if (!perfData.slowestQuery || executionTime > perfData.slowestQuery.ms) {
                                        perfData.slowestQuery = { ms: executionTime, query: "GLOBAL:".concat(model, ".").concat(operation) };
                                    }
                                }
                                return [2 /*return*/, result];
                        }
                    });
                });
            }
        }
    }
});
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.basePrisma;
// Precompute models that have companyId to avoid O(N) traversal on every query
var modelsWithCompanyId = new Set();
if (index_js_1.Prisma.dmmf && index_js_1.Prisma.dmmf.datamodel && index_js_1.Prisma.dmmf.datamodel.models) {
    for (var _i = 0, _b = index_js_1.Prisma.dmmf.datamodel.models; _i < _b.length; _i++) {
        var m = _b[_i];
        if (m.fields.some(function (f) { return f.name === 'companyId'; })) {
            modelsWithCompanyId.add(m.name);
        }
    }
}
var GLOBAL_MODELS = new Set([
    'Company', 'PlatformSettings', 'Plan', 'Coupon', 'SuperAdmin',
    'ActivityLog', 'Announcement', 'DeletionLog',
    'FeatureFlag', 'ReleaseNote', 'SupportTicket', 'DocumentPage',
    'ForumPost', 'ForumReply', 'Chat', 'Message',
    'CalendarContentPiece', 'AiRequestLog', 'CalendarEvent'
]);
// Cache for extended Prisma clients to prevent memory leaks and massive CPU overhead
var companyClients = new Map();
/**
 * Creates a company-scoped Prisma Client.
 * Automatically injects `companyId` into all relevant queries
 * to guarantee Row-Level Security (RLS) across the shared PostgreSQL database.
 */
var getCompanyPrisma = function (companyId, onSearchSync) {
    if (companyClients.has(companyId)) {
        return companyClients.get(companyId);
    }
    var extendedPrisma = exports.basePrisma.$extends({
        query: {
            $allModels: {
                $allOperations: function (_a) {
                    return __awaiter(this, arguments, void 0, function (_b) {
                        var anyArgs, startTime, result, executionTime, perfData;
                        var model = _b.model, operation = _b.operation, args = _b.args, query = _b.query;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    anyArgs = args || {};
                                    // 1. Company Scope Injection (Before Query)
                                    if (!GLOBAL_MODELS.has(model) && modelsWithCompanyId.has(model)) {
                                        // Force companyId into where clause for read/update/delete operations
                                        if (['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {
                                            anyArgs.where = __assign(__assign({}, anyArgs.where), { companyId: companyId });
                                        }
                                        // Force companyId into data for create operations
                                        if (['create', 'createMany'].includes(operation)) {
                                            if (operation === 'createMany' && Array.isArray(anyArgs.data)) {
                                                anyArgs.data = anyArgs.data.map(function (d) { return (__assign(__assign({}, d), { companyId: companyId })); });
                                            }
                                            else {
                                                anyArgs.data = __assign(__assign({}, anyArgs.data), { companyId: companyId });
                                            }
                                        }
                                        // Upsert is special because it has both where and create/update data
                                        if (operation === 'upsert') {
                                            anyArgs.where = __assign(__assign({}, anyArgs.where), { companyId: companyId });
                                            anyArgs.create = __assign(__assign({}, anyArgs.create), { companyId: companyId });
                                        }
                                    }
                                    startTime = Date.now();
                                    return [4 /*yield*/, query(anyArgs)];
                                case 1:
                                    result = _c.sent();
                                    executionTime = Date.now() - startTime;
                                    if (executionTime > 200) { // Log queries taking longer than 200ms
                                        console.warn("[Prisma Profiler - SLOW QUERY] Model: ".concat(model, ", Operation: ").concat(operation, ", Time: ").concat(executionTime, "ms"));
                                    }
                                    else if (process.env.PRISMA_PROFILER_LOG === 'true') {
                                        console.log("[Prisma Profiler] Model: ".concat(model, ", Operation: ").concat(operation, ", Time: ").concat(executionTime, "ms"));
                                    }
                                    perfData = exports.queryMetricsStorage.getStore();
                                    if (perfData) {
                                        perfData.numberOfQueries = (perfData.numberOfQueries || 0) + 1;
                                        perfData.databaseDuration = (perfData.databaseDuration || 0) + executionTime;
                                        if (!perfData.slowestQuery || executionTime > perfData.slowestQuery.ms) {
                                            perfData.slowestQuery = { ms: executionTime, query: "".concat(model, ".").concat(operation) };
                                        }
                                    }
                                    // 3. Search Sync (After Query)
                                    if (onSearchSync) {
                                        try {
                                            onSearchSync(model, operation, result, anyArgs);
                                        }
                                        catch (e) {
                                            console.error("[SearchSync] Error syncing ".concat(model, ":"), e);
                                        }
                                    }
                                    return [2 /*return*/, result];
                            }
                        });
                    });
                },
            },
        },
    });
    extendedPrisma.companyId = companyId;
    companyClients.set(companyId, extendedPrisma);
    return extendedPrisma;
};
exports.getCompanyPrisma = getCompanyPrisma;
