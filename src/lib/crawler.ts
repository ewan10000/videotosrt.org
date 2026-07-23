export const X_ROBOTS_TAG = "noindex,nofollow";

export function robotsTxt() {
  return "User-agent: *\nAllow: /\n";
}

export function withNoindexHeaders(response: Response) {
  try {
    response.headers.set("X-Robots-Tag", X_ROBOTS_TAG);
    return response;
  } catch {
    const nextResponse = new Response(response.body, response);
    nextResponse.headers.set("X-Robots-Tag", X_ROBOTS_TAG);
    return nextResponse;
  }
}
