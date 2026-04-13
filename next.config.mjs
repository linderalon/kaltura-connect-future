/** @type {import('next').NextConfig} */
// Set NEXT_PUBLIC_BASE_PATH=/kaltura-connect-future for GitHub Pages builds.
// Leave it empty (or unset) for Netlify / local dev.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath ? `${basePath}/` : "",
  images: { unoptimized: true },
};

export default nextConfig;
