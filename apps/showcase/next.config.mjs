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
        source: '/introduction',
        destination: '/docs?slug=introduction',
        permanent: false,
      },
      {
        source: '/quickstart',
        destination: '/docs?slug=quickstart',
        permanent: false,
      },
      {
        source: '/payments/:path*',
        destination: '/docs?slug=payments/:path*',
        permanent: false,
      },
      {
        source: '/agent-frameworks/:path*',
        destination: '/docs?slug=agent-frameworks/:path*',
        permanent: false,
      },
      {
        source: '/architecture/:path*',
        destination: '/docs?slug=architecture/:path*',
        permanent: false,
      },
      {
        source: '/integrations/:path*',
        destination: '/docs?slug=integrations/:path*',
        permanent: false,
      },
      {
        source: '/contracts/:path*',
        destination: '/docs?slug=contracts/:path*',
        permanent: false,
      },
      {
        source: '/apps/:path*',
        destination: '/docs?slug=apps/:path*',
        permanent: false,
      },
      {
        source: '/cli/:path*',
        destination: '/docs?slug=cli/:path*',
        permanent: false,
      },
      {
        source: '/errors/:path*',
        destination: '/docs?slug=errors/:path*',
        permanent: false,
      },
      {
        source: '/governance/:path*',
        destination: '/docs?slug=governance/:path*',
        permanent: false,
      },
      {
        source: '/docs/:slug+',
        destination: '/docs?slug=:slug+',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
