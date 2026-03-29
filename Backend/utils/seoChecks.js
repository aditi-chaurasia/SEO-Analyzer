export default function seoChecks(data) {
  const issues = [];

  if (!data.title) issues.push("Missing title tag");
  if (!data.description) issues.push("Missing meta description");

  if (data.h1Count === 0) issues.push("No H1 tag found");
  if (data.h1Count > 1) issues.push("Multiple H1 tags found");

  if (data.wordCount < 300) issues.push("Thin content (low word count)");

  if (data.missingAlt > 0)
    issues.push(`${data.missingAlt} images missing ALT text`);

  if (!data.https) issues.push("Website not using HTTPS");

  return issues;
}