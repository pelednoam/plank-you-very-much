/** @type {import('next').NextConfig} */
const nextConfig = {
  // Your regular Next.js config options go here
  reactStrictMode: true,
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig; // Export the plain config without Serwist 