/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/api/resume/upgrade/route": [
        "./node_modules/pdfkit/js/data/**/*",
        "./assets/fonts/**/*",
      ],
    },
  },
};

module.exports = nextConfig;
