/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable strict mode to avoid double rendering issues
  reactStrictMode: false,
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0' },
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
    ]
  },
  async rewrites() {
    return [
      // Bypass NextAuth completely for error path
      {
        source: '/api/auth/error',
        destination: '/clientes',
      },
      // Send any /mesa/:id directly to clientes with tableId param
      {
        source: '/mesa/:id*',
        destination: '/clientes?tableId=:id*',
      },
    ]
  },
}

module.exports = nextConfig
