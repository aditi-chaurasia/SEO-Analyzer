export default function calculateScore(data, issues, brokenLinks) {
  let score = 100;

  score -= issues.length * 5;
  score -= brokenLinks.length * 2;

  if (score < 0) score = 0;

  return score;
}