import { handleImageOptimization } from "vinext/server/image-optimization";

// @ts-expect-error virtual module resolved by vinext at build time
import { handleApiRoute, renderPage } from "virtual:vinext-server-entry";

interface Env {
  ASSETS: Fetcher;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const urlWithQuery = pathname + url.search;

      if (pathname.startsWith("//")) {
        return new Response("404 Not Found", { status: 404 });
      }

      if (pathname === "/_vinext/image") {
        return handleImageOptimization(request, {
          fetchAsset: (assetPath) => env.ASSETS.fetch(new Request(new URL(assetPath, request.url))),
          transformImage: async (body, { width, format, quality }) => {
            const result = await env.IMAGES.input(body)
              .transform(width > 0 ? { width } : {})
              .output({ format, quality });
            return result.response();
          }
        });
      }

      if (pathname.startsWith("/api/") || pathname === "/api") {
        return await handleApiRoute(request, urlWithQuery);
      }

      return await renderPage(request, urlWithQuery, null);
    } catch (error) {
      console.error("[vinext] Worker error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  }
};
