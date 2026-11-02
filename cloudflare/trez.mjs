function redirectTarget(requestUrl) {
  const sources = requestUrl.searchParams.getAll("source");
  const source = sources[0];
  if (sources.length !== 1 || !/^https?:\/\//i.test(source) || /[\u0000-\u001f\u007f]/.test(source)) {
    return null;
  }

  try {
    return new URL(source);
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  const entities = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return value.replace(/[&<>"']/g, (character) => entities[character]);
}

async function youTubePreview(videoId, target, requestUrl, refresh) {
  const metadataUrl = new URL("https://www.youtube.com/oembed");
  metadataUrl.searchParams.set("url", "https://www.youtube.com/watch?v=" + videoId);
  metadataUrl.searchParams.set("format", "json");

  try {
    const response = await fetch(metadataUrl.href, { redirect: "manual", signal: AbortSignal.timeout(2500) });
    if (!response.ok) {
      console.warn({ event: "trez_preview_unavailable", status: response.status });
      return null;
    }

    const { title, author_name: author, thumbnail_url: thumbnail } = await response.json();
    if (!title?.trim() || new URL(thumbnail).origin !== "https://i.ytimg.com") return null;

    const titleText = escapeHtml(title);
    const description = escapeHtml(author ? "Watch on YouTube · " + author : "Watch on YouTube");
    const destination = escapeHtml(target.href);
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${titleText}</title>
<meta property="og:title" content="${titleText}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${escapeHtml(requestUrl.href)}">
<meta property="og:image" content="${escapeHtml(thumbnail)}">
${refresh ? `<meta http-equiv="refresh" content="0; url=${destination}">` : ""}
</head>
<body><a href="${destination}">Watch on YouTube</a></body>
</html>`;
  } catch (error) {
    console.warn({ event: "trez_preview_unavailable", error: error.name });
    return null;
  }
}

export default {
  async fetch(request) {
    const requestUrl = new URL(request.url);
    const shareVideoId = requestUrl.pathname.match(/^\/trez\/youtube\/([\w-]{11})$/)?.[1];
    if (requestUrl.pathname !== "/trez" && !shareVideoId) {
      return fetch(request);
    }

    const target = shareVideoId
      ? new URL("https://www.youtube.com/shorts/" + shareVideoId)
      : redirectTarget(requestUrl);
    const videoId = shareVideoId ?? (target?.origin === "https://www.youtube.com"
      ? target.pathname.match(/^\/shorts\/([\w-]{11})\/?$/)?.[1]
      : null);
    const browserNavigation = request.headers.get("Sec-Fetch-Mode") === "navigate"
      || request.headers.get("Sec-Fetch-Dest") === "document"
      || request.headers.get("Sec-Fetch-User") === "?1";
    const acceptsPreview = shareVideoId || /^WhatsApp\//i.test(request.headers.get("User-Agent") ?? "");
    const wantsPreview = videoId && !browserNavigation && acceptsPreview
      && (request.method === "GET" || request.method === "HEAD");
    const preview = wantsPreview ? await youTubePreview(videoId, target, requestUrl, !shareVideoId) : null;
    const status = preview ? 200 : target ? 302 : 400;
    console.log({
      event: preview ? "trez_preview" : "trez_visit",
      ip: request.headers.get("CF-Connecting-IP"),
      status,
    });

    const headers = {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
      "Vary": "User-Agent, Sec-Fetch-Mode, Sec-Fetch-Dest, Sec-Fetch-User",
    };
    let body = null;
    if (preview) {
      headers["Content-Type"] = "text/html; charset=utf-8";
      body = preview;
    } else if (target) {
      headers.Location = target.href;
    } else {
      body = "Provide one URL-encoded HTTP or HTTPS URL in the source parameter.";
    }
    return new Response(request.method === "HEAD" ? null : body, { status, headers });
  },
};
