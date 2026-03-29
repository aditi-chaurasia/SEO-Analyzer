import "dotenv/config.js";
import express from "express";
import cors from "cors";
import fetchPage from "./utils/fetchPage.js";
import extractSeo from "./utils/extractSeo.js";
import seoChecks from "./utils/seoChecks.js";
import checkBrokenLinks from "./utils/brokenLinks.js";
import calculateScore from "./utils/scoring.js";
import crawlWebsite from "./utils/crawler.js";
import generateALTTextWithLangGraph from "./utils/altGenerator.js";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/analyze", async (req, res) => {
  const { url, geminiKey } = req.body;

  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    console.log(`Starting analysis for: ${url}`);
    const html = await fetchPage(url);
    const seoData = extractSeo(html, url);
    const issues = seoChecks(seoData);
    
    // Crawl entire website for all links and images
    const crawlData = await crawlWebsite(url);
    const brokenLinks = await checkBrokenLinks(crawlData.links);
    
    // Generate AI-powered ALT suggestions for images without ALT
    const imagesWithoutAlt = crawlData.images.filter(img => !img.hasAlt);

    const totalToProcess = Math.min(10, imagesWithoutAlt.length);
    const imagesWithAISuggestions = [];
    for (let i = 0; i < totalToProcess; i++) {
      const img = imagesWithoutAlt[i];
      try {
        const aiSuggestedAlt = await generateALTTextWithLangGraph({
          imageUrl: img.src,
          imageName: img.src.split("/").pop().split("?")[0],
          pageContext: img.foundOn,
          geminiKey,
        });
        imagesWithAISuggestions.push({ ...img, suggestedAlt: aiSuggestedAlt });
      } catch (error) {
        console.error('ALT generation failed for', img.src, error?.message || error);
        imagesWithAISuggestions.push(img); // Keep original suggestion if AI fails
      }
    }
    
    // Combine AI suggestions with original images
    const allImages = [
      ...imagesWithAISuggestions,
      ...imagesWithoutAlt.slice(totalToProcess), // Add remaining images without AI processing
    ];

    const score = calculateScore(seoData, issues, brokenLinks);

    res.json({
      score,
      seoData: {
        ...seoData,
        totalImages: crawlData.images.length,
        totalImagesWithoutAlt: imagesWithoutAlt.length,
      },
      images: crawlData.images,
      imagesWithoutAlt: allImages,
      issues,
      brokenLinks,
      totalLinksScanned: crawlData.links.length,
    });
  } catch (err) {
    console.error('Analysis error:', err);
    // Return more informative error for debugging (don't expose sensitive data in production)
    return res.status(500).json({ error: err.message || 'Analysis failed' });
  }
});

app.listen(3000, () => {
  console.log('SEO Analyzer Server running on http://localhost:3000');
});