const BASE = 'https://gcbtickets.com'

/** robots.txt de gcbtickets.com (el middleware reescribe /robots.txt aquí en ese dominio). */
export function GET() {
  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /api/',
    `Sitemap: ${BASE}/sitemap.xml`,
    `Host: ${BASE}`,
    '',
  ].join('\n')
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
