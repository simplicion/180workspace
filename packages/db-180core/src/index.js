'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.developersPrisma = exports.db180core = exports.corePrisma = void 0;
const client_1 = require("../generated/client");
__exportStar(require("../generated/client"), exports);
function getCoreDatabaseUrl() {
    return (process.env.CORE_DATABASE_URL ||
        process.env.DEVELOPERS_DATABASE_URL ||
        process.env.IDENTITY_DATABASE_URL ||
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/180developers_db?schema=public');
}
const globalForCorePrisma = globalThis;
exports.corePrisma = globalForCorePrisma.corePrisma ||
    new client_1.PrismaClient({
        datasources: {
            db: {
                url: getCoreDatabaseUrl(),
            },
        },
        log: process.env.NODE_ENV === 'development'
            ? ['error', 'warn']
            : ['error'],
    });
exports.db180core = exports.corePrisma;
exports.developersPrisma = exports.corePrisma;
if (process.env.NODE_ENV !== 'production') {
    globalForCorePrisma.corePrisma = exports.corePrisma;
}
exports.default = exports.corePrisma;
