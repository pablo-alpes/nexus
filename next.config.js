/** @type {import('next').NextConfig} */
const ignoreBuildErrors = process.env.IGNORE_BUILD_ERRORS === 'true';

const nextConfig = {
  reactStrictMode: true,
  ...(ignoreBuildErrors && {
    typescript: {
      ignoreBuildErrors: true,
    },
  }),
  // Allow cross-origin requests in dev mode (for VPS deployment)
  // This fixes the "Cross origin request detected" warning when accessing via public IP
  ...(process.env.NODE_ENV === 'development' && {
    // Allow all origins in dev mode for VPS access
    experimental: {
      allowedDevOrigins: ['*'],
    },
  }),
  webpack: (config) => {
    config.externals = config.externals || [];
    config.externals.push({
      'onnxruntime-node': 'commonjs onnxruntime-node',
    });
    return config;
  },
}

module.exports = nextConfig

