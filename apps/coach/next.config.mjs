/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Die geteilten Pakete liegen als TypeScript-Quelle vor und werden
  // von Next mitkompiliert — kein eigener Build-Schritt nötig.
  transpilePackages: [
    "@ptfive/types",
    "@ptfive/tokens",
    "@ptfive/db",
    "@ptfive/coach-engine",
  ],
};

export default nextConfig;
