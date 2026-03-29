import axios from "axios";
import * as cheerio from "cheerio";
import generateALTTextWithLangGraph from "./altGenerator.js";

// Generate suggested ALT text based on filename
function generateAlt(src, currentAlt) {
  if (currentAlt) return null; // No suggestion needed if alt already exists
  
  const filename = src.split("/").pop().split("?")[0];
  const name = filename
    .replace(/\.(jpg|jpeg|png|gif|webp|svg)$/i, "")
    .replace(/[-_]/g, " ")
    .replace(/\d+$/g, "")
    .trim();
  
  return name ? `${name} image` : "Image";
}

export default async function crawlWebsite(startUrl) {
  const visited = new Set();
  const allLinks = [];
  const allImages = [];
  const baseDomain = new URL(startUrl).hostname;
  const queue = [startUrl];

  while (queue.length > 0 && visited.size < 20) {
    // Reduced to 20 pages for faster crawling
    const url = queue.shift();

    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const response = await axios.get(url, {
        timeout: 5000,
        headers: { "User-Agent": "SEO Analyzer Bot" },
      });

      const $ = cheerio.load(response.data);

      // Extract all images
      $("img").each((i, el) => {
        const src = $(el).attr("src");
        const alt = $(el).attr("alt");
        if (src) {
          // Convert relative URLs to absolute
          let imageSrc = src;
          try {
            if (!src.startsWith("http")) {
              imageSrc = new URL(src, url).href;
            }
          } catch (e) {
            // Keep original if conversion fails
          }
          
          allImages.push({
            src: imageSrc,
            alt: alt || "",
            hasAlt: !!alt,
            foundOn: url,
            suggestedAlt: generateAlt(src, alt), // Initial fallback suggestion
          });
        }
      });

      // Extract all external links
      $("a").each((i, el) => {
        const href = $(el).attr("href");
        const text = $(el).text().trim();

        if (href && href.startsWith("http")) {
          allLinks.push({
            url: href,
            text: text || "No text",
            selector: $(el).parent().attr("class") || "unknown",
            foundOn: url,
          });
        }
      });

      // Extract internal links for crawling
      $("a").each((i, el) => {
        const href = $(el).attr("href");

        if (href && !href.startsWith("http")) {
          // Relative URL
          try {
            const absoluteUrl = new URL(href, url).href;
            const linkDomain = new URL(absoluteUrl).hostname;

            if (linkDomain === baseDomain && !visited.has(absoluteUrl)) {
              queue.push(absoluteUrl);
            }
          } catch (e) {
            // Skip invalid URLs
          }
        } else if (href && href.startsWith("http")) {
          // Absolute URL - only add if same domain
          try {
            const linkDomain = new URL(href).hostname;
            if (linkDomain === baseDomain && !visited.has(href)) {
              queue.push(href);
            }
          } catch (e) {
            // Skip invalid URLs
          }
        }
      });
    } catch (err) {
    }
  }

  return { links: allLinks, images: allImages };
}
