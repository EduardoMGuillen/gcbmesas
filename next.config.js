/** @type {import('next').NextConfig} */
const nextConfig = {
  // Disable strict mode to avoid double rendering issues
  reactStrictMode: false,
  async redirects() {
    return [
      {
        source: '/api/auth/error',
        destination: '/clientes',
        permanent: false,
      },
    ]
  },
}

module.exports = nextConfig
