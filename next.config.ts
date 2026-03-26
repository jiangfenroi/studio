import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
  // 针对医疗内网优化：移除所有实验性/不稳定的开发配置
  // 确保在 Windows 7 环境下启动性能最优化
  devIndicators: {
    appIsrStatus: false,
  },
};

export default nextConfig;
