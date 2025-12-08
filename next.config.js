/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({
      'onnxruntime-node': 'commonjs onnxruntime-node',
    });
    return config;
  },
}

module.exports = nextConfig

