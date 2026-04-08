/**
 * Pure HTML/text parsing utilities. No Convex APIs, no "use node" needed.
 * Safe to import in both V8 and Node.js Convex runtimes.
 */

export function extractText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#\d+;/g, "")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Extract text content of the first matching HTML element. */
export function extractElement(
  html: string,
  tag: string,
  attribute?: string,
  attributeValue?: string
): string {
  let pattern: RegExp;
  if (attribute && attributeValue) {
    pattern = new RegExp(
      `<${tag}[^>]*${attribute}=["'][^"']*${attributeValue}[^"']*["'][^>]*>([\\s\\S]*?)<\\/${tag}>`,
      "i"
    );
  } else {
    pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  }
  const match = html.match(pattern);
  return match ? extractText(match[1]) : "";
}

/** Extract all <a href> links from an HTML string. */
export function extractLinks(
  html: string
): Array<{ href: string; text: string }> {
  const results: Array<{ href: string; text: string }> = [];
  const linkRegex = /<a\b[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const text = extractText(match[2]).trim();
    if (text) results.push({ href: match[1], text });
  }
  return results;
}

/** Parse the first USD dollar amount range or single amount from text. */
export function parseAmounts(text: string): {
  amountMin?: number;
  amountMax?: number;
} {
  // Handles: $5,000 | $5k | $5K | $2.5 million | $2.5M | $2,500,000
  function parseDollar(num: string, suffix?: string): number {
    const n = parseFloat(num.replace(/,/g, ""));
    if (suffix && /million/i.test(suffix)) return Math.round(n * 1_000_000);
    if (suffix && /^M$/.test(suffix.trim())) return Math.round(n * 1_000_000);
    if (suffix && /[kK]/.test(suffix)) return Math.round(n * 1_000);
    return Math.round(n);
  }

  const NUM = `([0-9,]+(?:\\.[0-9]+)?)`;
  const SUF = `\\s*(million|M|[kK])?`;

  // "$X[k/M/million] to $Y[k/M/million]"
  const rangeRe = new RegExp(
    `\\$\\s*${NUM}${SUF}\\s*(?:to|–|—|-)\\s*\\$\\s*${NUM}${SUF}`,
    "i"
  );
  const rangeMatch = text.match(rangeRe);
  if (rangeMatch) {
    return {
      amountMin: parseDollar(rangeMatch[1], rangeMatch[2]),
      amountMax: parseDollar(rangeMatch[3], rangeMatch[4]),
    };
  }

  // "up to $X [million/M/k]"
  const upToRe = new RegExp(
    `up\\s+to\\s+\\$\\s*${NUM}${SUF}`,
    "i"
  );
  const upToMatch = text.match(upToRe);
  if (upToMatch) {
    return { amountMax: parseDollar(upToMatch[1], upToMatch[2]) };
  }

  // "maximum [of/grant] $X [million/M/k]"
  const maxRe = new RegExp(
    `maximum(?:\\s+(?:of|grant))?\\s+(?:is\\s+)?\\$\\s*${NUM}${SUF}`,
    "i"
  );
  const maxMatch = text.match(maxRe);
  if (maxMatch) {
    return { amountMax: parseDollar(maxMatch[1], maxMatch[2]) };
  }

  // "$X.X million" or "$XM" standalone (before plain-number match to avoid grabbing $3 from $3.5 million)
  const millionRe = new RegExp(`\\$\\s*${NUM}\\s*(million|MM)\\b`, "i");
  const millionMatch = text.match(millionRe);
  if (millionMatch) {
    return { amountMax: parseDollar(millionMatch[1], millionMatch[2]) };
  }

  // "average ... $X"
  const avgRe = new RegExp(
    `average[^$\\n]{0,20}\\$\\s*${NUM}${SUF}`,
    "i"
  );
  const avgMatch = text.match(avgRe);
  if (avgMatch) {
    const v = parseDollar(avgMatch[1], avgMatch[2]);
    return { amountMin: v, amountMax: v };
  }

  // "$X,XXX" comma-separated (require at least one comma group to avoid tiny amounts)
  const commaRe = /\$\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]+)?)/;
  const commaMatch = text.match(commaRe);
  if (commaMatch) {
    return { amountMax: parseDollar(commaMatch[1]) };
  }

  return {};
}

const MONTH_RE =
  "(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)";

/** Return the timestamp of the first future-looking deadline found in text. */
export function parseDeadline(text: string): number | undefined {
  const candidates: Date[] = [];

  // "January 15, 2025" or "January 15 2025"
  const re1 = new RegExp(
    `\\b(${MONTH_RE})\\s+(\\d{1,2}),?\\s+(\\d{4})\\b`,
    "gi"
  );
  let m;
  while ((m = re1.exec(text)) !== null) {
    const d = new Date(`${m[1]} ${m[2]}, ${m[3]}`);
    if (!isNaN(d.getTime())) candidates.push(d);
  }

  // "15 January 2025"
  const re2 = new RegExp(
    `\\b(\\d{1,2})\\s+(${MONTH_RE})\\s+(\\d{4})\\b`,
    "gi"
  );
  while ((m = re2.exec(text)) !== null) {
    const d = new Date(`${m[2]} ${m[1]}, ${m[3]}`);
    if (!isNaN(d.getTime())) candidates.push(d);
  }

  // MM/DD/YYYY
  const re3 = /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g;
  while ((m = re3.exec(text)) !== null) {
    const d = new Date(`${m[1]}/${m[2]}/${m[3]}`);
    if (!isNaN(d.getTime())) candidates.push(d);
  }

  if (candidates.length === 0) return undefined;

  // Prefer future dates; fall back to most recent past date
  const now = Date.now();
  const future = candidates.filter((d) => d.getTime() > now);
  if (future.length > 0) {
    return Math.min(...future.map((d) => d.getTime()));
  }
  return Math.max(...candidates.map((d) => d.getTime()));
}

export function truncate(text: string, max = 50_000): string {
  return text.length <= max ? text : text.slice(0, max) + "…[truncated]";
}

export const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};
