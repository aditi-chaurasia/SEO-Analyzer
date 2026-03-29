import * as cheerio from "cheerio";

export default function extractSeo(html, url) {
  const $ = cheerio.load(html);

  const title = $("title").text();
  const description = $('meta[name="description"]').attr("content");

  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const h3Count = $("h3").length;

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.split(" ").length;

  const images = $("img").length;
  const imagesWithoutAlt = [];

  $("img").each((i, el) => {
    const alt = $(el).attr("alt");
    const src = $(el).attr("src");
    if (!alt) imagesWithoutAlt.push({ src });
  });

  const links = [];
  $("a").each((i, el) => {
    const href = $(el).attr("href");
    const text = $(el).text().trim();
    if (href && href.startsWith("http")) {
      links.push({ url: href, text: text || "No text", selector: $(el).parent().attr("class") || "unknown" });
    }
  });

  return {
    url,
    title,
    description,
    h1Count,
    h2Count,
    h3Count,
    wordCount,
    images,
    missingAlt: imagesWithoutAlt.length,
    imagesWithoutAlt,
    https: url.startsWith("https"),
    links,
  };
}