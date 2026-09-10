/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  async redirects() {
    return [
      {
        source: '/docs',
        destination: 'https://emeditweb.gitbook.io/x402',
        permanent: true,
      },
      {
        source: '/docs/:path*',
        destination: 'https://emeditweb.gitbook.io/x402',
        permanent: true,
      },
      {
        source: '/introduction',
        destination: 'https://emeditweb.gitbook.io/x402/getting-started/introduction',
        permanent: true,
      },
      {
        source: '/quickstart',
        destination: 'https://emeditweb.gitbook.io/x402/getting-started/quickstart',
        permanent: true,
      },
      {
        source: '/payments/:path*',
        destination: 'https://emeditweb.gitbook.io/x402',
        permanent: true,
      },
      {
        source: '/agent-frameworks/:path*',
        destination: 'https://emeditweb.gitbook.io/x402',
        permanent: true,
      },
      {
        source: '/architecture/:path*',
        destination: 'https://emeditweb.gitbook.io/x402',
        permanent: true,
      },
      {
        source: '/integrations/:path*',
        destination: 'https://emeditweb.gitbook.io/x402',
        permanent: true,
      },
      {
        source: '/contracts/:path*',
        destination: 'https://emeditweb.gitbook.io/x402',
        permanent: true,
      },
      {
        source: '/apps/:path*',
        destination: 'https://emeditweb.gitbook.io/x402',
        permanent: true,
      },
      {
        source: '/cli/:path*',
        destination: 'https://emeditweb.gitbook.io/x402',
        permanent: true,
      },
      {
        source: '/errors/:path*',
        destination: 'https://emeditweb.gitbook.io/x402',
        permanent: true,
      },
      {
        source: '/governance/:path*',
        destination: 'https://emeditweb.gitbook.io/x402',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
