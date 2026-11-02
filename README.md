# portfolio
Portfolio and SEO-optimized landing pages for Chrome extensions (Key Jump, JobRizzer, and Quick Sender Search for Gmail), web projects (How to Start, Claude Lessons, and My GPT List), and startups (Yapmuch and GameClipper Advanced).

## Redirect route

Use https://bkzly.com/trez?source= followed by the output of JavaScript's
`encodeURIComponent(destinationUrl)`. The destination must be an absolute HTTP
or HTTPS URL. The route returns an HTTP 302 at Cloudflare's edge. For WhatsApp
previews of YouTube Shorts on `www.youtube.com`, it uses the video title and
thumbnail from YouTube. Those preview requests are logged as `trez_preview`.

For a YouTube Short, share `https://bkzly.com/trez/youtube/<video-id>` to give
preview clients a URL without a query string. Browser navigation requests
receive a 302 to the Short. Other clients receive its preview metadata and
a link to open it.

In the Cloudflare dashboard, open **Workers & Pages → bkzly-trez →
Observability → Logs** and search for `trez_visit` to see the IP and status
for each request, along with its timestamp. Logs follow the Workers Logs
retention period for the account's plan.

The edge route is deployed separately from the portfolio container. To deploy
an update with an authenticated Wrangler session, run
`npx wrangler deploy --config cloudflare/wrangler.toml` from this directory.
