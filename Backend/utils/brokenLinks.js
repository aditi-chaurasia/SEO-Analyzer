import axios from "axios";

async function checkLink(linkObj) {
  const link = typeof linkObj === "string" ? linkObj : linkObj.url;
  const text = typeof linkObj === "string" ? "" : linkObj.text;
  const selector = typeof linkObj === "string" ? "" : linkObj.selector;
  const foundOn = typeof linkObj === "string" ? "" : linkObj.foundOn;
  
  try {
    await axios.head(link, { timeout: 3000 });
    return null; // Link is good
  } catch (err) {
    return {
      url: link,
      text: text,
      selector: selector,
      foundOn: foundOn,
      status: err.response?.status || "Error",
    };
  }
}

export default async function checkBrokenLinks(links) {
  // Check links in parallel with max 5 concurrent requests
  const batchSize = 5;
  const results = [];

  for (let i = 0; i < links.length; i += batchSize) {
    const batch = links.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(checkLink));
    results.push(...batchResults.filter((r) => r !== null));
  }

  return results;
}