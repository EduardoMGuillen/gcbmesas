import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/','/eventos','/eventos/','/cbtickets','/cbtickets/'],
        disallow: ['/admin/','/api/','/login','/mesero/','/cajero/','/taquilla/','/cocina/','/bar/','/clientes/'],
      },
    ],
    sitemap: [
      'https://lagrancasablanca.com/sitemap.xml',
      'https://gcbtickets.com/cbtickets/sitemap.xml',
    ],
  }
}
