/** @type {import('next').NextConfig} */
const nextConfig = {
  // Output configuration - use 'export' for static build, undefined for dev
  output: process.env.NODE_ENV === 'production' ? 'export' : undefined,
  
  // Trailing slashes for static export
  trailingSlash: true,
  
  // Experimental features for better performance
  experimental: {
    // Optimize package imports
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  
  // Build optimizations
  eslint: {
    // Enable linting during production builds
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Enable type checking during production builds
    ignoreBuildErrors: false,
  },
  
  // Image optimization - must be disabled for static export
  images: {
    unoptimized: true,
  },
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Webpack configuration for better Docker hot reload in development
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
