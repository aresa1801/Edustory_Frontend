/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '150mb',
    },
  },
  async redirects() {
    return [
      // Kurasi kini menjadi bagian dari Dashboard Pengajar
      { source: '/curation', destination: '/dashboard/tutor/curation/progress', permanent: false },
      { source: '/curation/:path*', destination: '/dashboard/tutor/curation/:path*', permanent: false },
    ]
  },
}

export default nextConfig
