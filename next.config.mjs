/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  // GitHub Pages serves at /kaltura-connect-future — only apply in prod builds
  basePath: isProd ? "/kaltura-connect-future" : "",
  assetPrefix: isProd ? "/kaltura-connect-future/" : "",
  images: { unoptimized: true },
};

export default nextConfig;
