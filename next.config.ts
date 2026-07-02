import { withSerwist } from "@serwist/turbopack";

const nextConfig = {
  reactStrictMode: true,
  turbopack: {},
  experimental: {
    optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', 'framer-motion'],
  },
};

export default withSerwist(nextConfig);
