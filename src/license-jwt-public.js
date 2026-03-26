/**
 * Public half of RS256 key pair used to verify Pro license + free-trial JWTs in the extension.
 * MUST match feed-server LICENSE_JWT_PRIVATE_KEY.
 *
 * 1. Generate keys — see developer/LICENSE-JWT-KEYS.md
 * 2. Paste the public PEM below (keep BEGIN/END lines).
 */
(function (global) {
  global.DEVLYNX_LICENSE_JWT_PUBLIC_PEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwiuYlX6MVH9K3K810Dkq
uWPOFo+mD6IVNA1GNrJ4SCXLAZuLUlNnNtQLpbn73GRht0knFSlYlhs5SHfJacdg
MQWaV5GdGhZ0KkDLbMYya3HDoGvISWvDfKeFvwCYefvuiNTs6b5Y4RoQwaBWnBpj
g4j913tXK9ugAy1LaEQK/ngMG8Qvo8nKGrCoron5ypWoxfush36/reKLGv6oNVLw
dn8bHqOyCWgbqOpn7wB/Xjy2J/t5rb1xkovvVWcqFz/I9N7z2YSbesx+ZcaO3Ulh
mbAgdOPuyOGT82MU1yJAvdhYyhOc8GNWdv4cku7SR9xdevWOuxgS7cRNMcl6A8OZ
mQIDAQAB
-----END PUBLIC KEY-----`;

  /** Reserved for HS256 dev signing (not used for local verify). Cleared on production build. */
  global.DEVLYNX_LICENSE_JWT_DEV_SECRET = '';
})(typeof self !== 'undefined' ? self : globalThis);
