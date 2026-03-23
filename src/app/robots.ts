import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/contratos/', '/liquidaciones/', '/permisos/', '/perfil/', '/facturacion/', '/cartola/', '/api/'],
      },
    ],
    sitemap: 'https://gesti.cl/sitemap.xml',
  }
}
