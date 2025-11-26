/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output configuration for Docker production builds
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  
  // Experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Build optimizations
  eslint: {
    // In production, you may want to enable linting during builds
    ignoreDuringBuilds: process.env.NODE_ENV !== 'production',
  },
  typescript: {
    // In production, you may want to enable type checking
    ignoreBuildErrors: process.env.NODE_ENV !== 'production',
  },
  
  // Image optimization (enable in production for better performance)
  images: {
    unoptimized: process.env.NODE_ENV !== 'production',
    // Add your image domains if using external images
    // remotePatterns: [
    //   {
    //     protocol: 'https',
    //     hostname: 'example.com',
    //   },
    // ],
  },
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Webpack configuration for better Docker hot reload
  webpack: (config, { dev, isServer }) => {
    // Enable polling for file changes in Docker environments
    if (dev) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding
      }
    }
    return config
  },
}

export default nextConfig
