import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin (and its transitive deps like jwks-rsa → jose) must stay a
  // genuine external Node package on the server, never processed by the
  // bundler. Turbopack's build was mis-resolving jose to its ESM `webapi`
  // build and emitting a require() of it, crashing on Vercel with
  // ERR_REQUIRE_ESM. Keeping it external + building with webpack (see the
  // build script) resolves jose to its CommonJS build correctly.
  serverExternalPackages: ["firebase-admin"],
};

export default nextConfig;
