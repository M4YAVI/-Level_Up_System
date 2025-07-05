/** @type {import('next').NextConfig} */
const nextConfig = {
  // This creates a static export of your app in the 'out' directory
  output: 'export',
  // Optional: Disables image optimization, which is not needed for local Electron app
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
