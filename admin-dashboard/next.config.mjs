/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // 支持 Docker 构建
  experimental: {
    externalDir: true
  }
}

export default nextConfig
