/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Servir en AVIF (más ligero) con fallback a WebP
    formats: ['image/avif', 'image/webp'],
    // Limitar tamaños generados para no crear imágenes gigantes
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [128, 256, 384, 600],
  },
  // Desactivar cache del router cliente para que siempre pida datos frescos
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

module.exports = nextConfig;