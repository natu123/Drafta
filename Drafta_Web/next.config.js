/** @type {import('next').NextConfig} */
const nextConfig = {
  agentRules: false,
  output: 'export',
  // Readable names in CPU profiles of the optimized build (measuring only; never set for production).
  productionBrowserSourceMaps: process.env.DRAFTA_SOURCE_MAPS === '1',
  trailingSlash: true,
  allowedDevOrigins: [
    '127.0.0.1',
    '6000-firebase-studio-1759286430513.cluster-euie3bjlbvhliv5fpqv5ofgi46.cloudworkstations.dev',
  ],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
}

module.exports = nextConfig
