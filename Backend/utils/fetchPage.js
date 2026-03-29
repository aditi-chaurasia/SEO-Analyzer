import axios from "axios";

export default async function fetchPage(url) {
  try {
    const res = await axios.get(url, {
      timeout: 10000,
      headers: {
        // Use a browser-like User-Agent to reduce bot blocking
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: url,
      },
      // follow redirects
      maxRedirects: 5,
    });

    return res.data;
  } catch (err) {
    // Provide a clearer error to the caller
    const status = err.response?.status;
    if (status === 403) {
      throw new Error(`Remote server returned 403 Forbidden (likely blocks non-browser requests). Try using a browser-like UA or a headless browser.`);
    }
    throw err;
  }
}