import { createSerwistRoute } from "@serwist/turbopack";

export const { GET, generateStaticParams } = createSerwistRoute({
  swSrc: "src/sw.ts",
});
