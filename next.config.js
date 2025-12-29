/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable strict mode to avoid double rendering issues
  reactStrictMode: false,
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
