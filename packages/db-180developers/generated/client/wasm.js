
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  email: 'email',
  phone: 'phone',
  password: 'password',
  passwordHash: 'passwordHash',
  username: 'username',
  name: 'name',
  avatarUrl: 'avatarUrl',
  photoUrl: 'photoUrl',
  image: 'image',
  bio: 'bio',
  headline: 'headline',
  location: 'location',
  latitude: 'latitude',
  longitude: 'longitude',
  city: 'city',
  country: 'country',
  role: 'role',
  isVerified: 'isVerified',
  emailVerified: 'emailVerified',
  isActive: 'isActive',
  isOnboardingComplete: 'isOnboardingComplete',
  otpCode: 'otpCode',
  otpExpiry: 'otpExpiry',
  companyId: 'companyId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OAuthAppScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  clientId: 'clientId',
  clientSecretHash: 'clientSecretHash',
  clientSecretHint: 'clientSecretHint',
  redirectUris: 'redirectUris',
  allowedOrigins: 'allowedOrigins',
  logoUrl: 'logoUrl',
  homepageUrl: 'homepageUrl',
  isVerified: 'isVerified',
  isActive: 'isActive',
  enableAuth: 'enableAuth',
  enablePay: 'enablePay',
  webhookUrl: 'webhookUrl',
  webhookSecret: 'webhookSecret',
  allowedScopes: 'allowedScopes',
  userId: 'userId',
  companyId: 'companyId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OAuthAuthorizationCodeScalarFieldEnum = {
  id: 'id',
  code: 'code',
  appId: 'appId',
  userId: 'userId',
  redirectUri: 'redirectUri',
  scopes: 'scopes',
  codeChallenge: 'codeChallenge',
  codeChallengeMethod: 'codeChallengeMethod',
  expiresAt: 'expiresAt',
  usedAt: 'usedAt',
  createdAt: 'createdAt'
};

exports.Prisma.OAuthTokenScalarFieldEnum = {
  id: 'id',
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  tokenType: 'tokenType',
  scopes: 'scopes',
  appId: 'appId',
  userId: 'userId',
  expiresAt: 'expiresAt',
  revokedAt: 'revokedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OAuthConsentScalarFieldEnum = {
  id: 'id',
  appId: 'appId',
  userId: 'userId',
  scopes: 'scopes',
  grantedAt: 'grantedAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.OtpVerificationScalarFieldEnum = {
  id: 'id',
  identifier: 'identifier',
  type: 'type',
  code: 'code',
  expiresAt: 'expiresAt',
  verified: 'verified',
  attempts: 'attempts',
  userId: 'userId',
  createdAt: 'createdAt'
};

exports.Prisma.SecurityKeyScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  credentialId: 'credentialId',
  publicKey: 'publicKey',
  counter: 'counter',
  transports: 'transports',
  createdAt: 'createdAt'
};

exports.Prisma.DeveloperMetricScalarFieldEnum = {
  id: 'id',
  appId: 'appId',
  endpoint: 'endpoint',
  statusCode: 'statusCode',
  latencyMs: 'latencyMs',
  createdAt: 'createdAt'
};

exports.Prisma.WebhookEndpointScalarFieldEnum = {
  id: 'id',
  appId: 'appId',
  url: 'url',
  secret: 'secret',
  events: 'events',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.WebhookDeliveryScalarFieldEnum = {
  id: 'id',
  endpointId: 'endpointId',
  event: 'event',
  payload: 'payload',
  statusCode: 'statusCode',
  response: 'response',
  error: 'error',
  deliveredAt: 'deliveredAt',
  createdAt: 'createdAt'
};

exports.Prisma.WalletScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  developerAppId: 'developerAppId',
  balance: 'balance',
  currency: 'currency',
  isLocked: 'isLocked',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LedgerEntryScalarFieldEnum = {
  id: 'id',
  walletId: 'walletId',
  amount: 'amount',
  balanceAfter: 'balanceAfter',
  type: 'type',
  referenceId: 'referenceId',
  description: 'description',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.CheckoutSessionScalarFieldEnum = {
  id: 'id',
  appId: 'appId',
  userId: 'userId',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  title: 'title',
  description: 'description',
  returnUrl: 'returnUrl',
  cancelUrl: 'cancelUrl',
  metadata: 'metadata',
  expiresAt: 'expiresAt',
  completedAt: 'completedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayoutRequestScalarFieldEnum = {
  id: 'id',
  appId: 'appId',
  userId: 'userId',
  amount: 'amount',
  currency: 'currency',
  status: 'status',
  payoutMethod: 'payoutMethod',
  accountDetails: 'accountDetails',
  adminNote: 'adminNote',
  transactionRef: 'transactionRef',
  requestedAt: 'requestedAt',
  processedAt: 'processedAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};


exports.Prisma.ModelName = {
  User: 'User',
  OAuthApp: 'OAuthApp',
  OAuthAuthorizationCode: 'OAuthAuthorizationCode',
  OAuthToken: 'OAuthToken',
  OAuthConsent: 'OAuthConsent',
  OtpVerification: 'OtpVerification',
  SecurityKey: 'SecurityKey',
  DeveloperMetric: 'DeveloperMetric',
  WebhookEndpoint: 'WebhookEndpoint',
  WebhookDelivery: 'WebhookDelivery',
  Wallet: 'Wallet',
  LedgerEntry: 'LedgerEntry',
  CheckoutSession: 'CheckoutSession',
  PayoutRequest: 'PayoutRequest'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
