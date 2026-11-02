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

export default {
  fetch(request) {
    const requestUrl = new URL(request.url);
    if (requestUrl.pathname !== "/trez") {
      return fetch(request);
    }

    const target = redirectTarget(requestUrl);
    const status = target ? 302 : 400;
    console.log({
      event: "trez_visit",
      ip: request.headers.get("CF-Connecting-IP"),
      status,
    });

    const headers = {
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    };
    if (target) {
      headers.Location = target.href;
    }
    const body = target || request.method === "HEAD" ? null : "Provide one URL-encoded HTTP or HTTPS URL in the source parameter.";
    return new Response(body, { status, headers });
  },
};
