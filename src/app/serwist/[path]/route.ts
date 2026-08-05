import { createSerwistRoute } from "@serwist/turbopack";

const route = createSerwistRoute({
  swSrc: "src/sw.ts",
});

const serwistGet = route.GET;

// The service worker must never be cached long-term: if the browser/CDN caches
// it, an installed PWA keeps running stale code and never picks up new builds.
// Next.js statically caches force-static route handlers with
// `Cache-Control: s-maxage=31536000`, so override it here (mirrored in
// netlify.toml for the CDN edge).
export const GET = async (request: Request, context: { params: Promise<{ path: string }> }) => {
  const response = await serwistGet(request, context);
  response.headers.set("Cache-Control", "public, max-age=0, must-revalidate");
  response.headers.set("Service-Worker-Allowed", "/");
  return response;
};

export const dynamic = "force-static";
export const dynamicParams = false;
export const revalidate = false;
export const generateStaticParams = route.generateStaticParams;
