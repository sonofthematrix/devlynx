/**
 * Public half of RS256 key pair used to verify Pro license + free-trial JWTs in the extension.
 * MUST match feed-server LICENSE_JWT_PRIVATE_KEY.
 *
 * 1. Generate keys — see developer/LICENSE-JWT-KEYS.md
 * 2. Paste the public PEM below (keep BEGIN/END lines).
 */
(function (global) {
  global.DEVLYNX_LICENSE_JWT_PUBLIC_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAs9YtFE040aRCzsxlFFDH
dfBtp6RwVlQxLzTMQagHJeNMTYPztoBZund56O8yzp/eCLrHoLMPA+dj/hGpX59+
OFi2CVbYATdlehbZjL+MkozyEIrKX/CCT//O6EqocXJvJAGDbnuLIAnydFfZDYME
Ky91AVw1INbhUUVL+d/ObjH/VsuXQbinMgXQKEpJ8a8y9XItNJLYvEu1IL2bw9uG
DQT2b02FMmQlCyiLPWNZ4NQjih9tYO4NNeTweFJiJOIYMSkKaz5nhmUBxR2UpNFt
Qp/tfUVjJ79X6Iw2/5nwnojUnYJt97jE2CNogvsnMZvOWBNQVj3ToIw0zh5yk0AX
iwIDAQAB
-----END PUBLIC KEY-----`;

  /** Reserved for HS256 dev signing (not used for local verify). Cleared on production build. */
  global.DEVLYNX_LICENSE_JWT_DEV_SECRET = '';
})(typeof self !== 'undefined' ? self : globalThis);
