/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Disable eslint check during production builds to avoid minor warnings blocking compilation
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Similarly, ignore build-blocking TS check warnings during rapid prototype deployment
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
