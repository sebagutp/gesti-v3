/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gesti.cl',
      },
    ],
  },
}

export default nextConfig
