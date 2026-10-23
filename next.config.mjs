/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // The Stellar SDK is only used by API routes/scripts; keep it external on
    // the server so it is never bundled for the browser.
    serverComponentsExternalPackages: ["@stellar/stellar-sdk"],
  },
};

export default nextConfig;
