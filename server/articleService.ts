import { URL } from 'url';

export interface ExtractedArticle {
  title: string;
  url: string;
  text: string;
  author?: string;
  publishedDate?: string;
  sourceDomain: string;
}

// Basic SSRF check against loopback, private ranges, and cloud metadata
function isSafeUrl(targetUrl: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(targetUrl);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Only HTTP and HTTPS protocols are supported.' };
    }

    const host = parsed.hostname.toLowerCase();

    // Check localhost & loopback
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal')
    ) {
      return { safe: false, reason: 'Local network addresses are restricted.' };
    }

    // Cloud metadata IPs (AWS, GCP, Azure)
    if (host === '169.254.169.254' || host === 'metadata.google.internal') {
      return { safe: false, reason: 'Cloud metadata access is forbidden.' };
    }

    // Private IPv4 ranges
    const ipParts = host.split('.').map(Number);
    if (ipParts.length === 4 && ipParts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
      if (ipParts[0] === 10) return { safe: false, reason: 'Private network addresses are restricted.' };
      if (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31) return { safe: false, reason: 'Private network addresses are restricted.' };
      if (ipParts[0] === 192 && ipParts[1] === 168) return { safe: false, reason: 'Private network addresses are restricted.' };
      if (ipParts[0] === 127) return { safe: false, reason: 'Loopback network addresses are restricted.' };
    }

    return { safe: true };
  } catch (e: any) {
    return { safe: false, reason: 'Invalid URL format.' };
  }
}

export async function extractArticleFromUrl(articleUrl: string): Promise<ExtractedArticle> {
  const safety = isSafeUrl(articleUrl);
  if (!safety.safe) {
    throw new Error(safety.reason || 'Invalid or prohibited target URL.');
  }

  const parsedUrl = new URL(articleUrl);
  const sourceDomain = parsedUrl.hostname.replace(/^www\./, '');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const res = await fetch(articleUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SummarAIBot/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`Target website returned HTTP status ${res.status}: ${res.statusText}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml+xml')) {
      throw new Error(`Unsupported content type: ${contentType}. Please provide a standard HTML web page.`);
    }

    const html = await res.text();

    // Extract Title
    let title = '';
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      title = ogTitleMatch[1].trim();
    } else {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch && titleMatch[1]) {
        title = titleMatch[1].trim();
      }
    }

    // Clean HTML to extract textual body content
    // Remove script, style, svg, nav, footer, noscript, header
    let clean = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, '')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, '')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, '')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, '');

    // Extract article or main if present
    const articleMatch = clean.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = clean.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
    const contentHtml = articleMatch ? articleMatch[1] : (mainMatch ? mainMatch[1] : clean);

    // Extract paragraphs and headings
    const paragraphMatches = contentHtml.match(/<(p|h1|h2|h3|h4|li)[^>]*>([\s\S]*?)<\/\1>/gi) || [];
    const extractedParagraphs: string[] = [];

    for (const match of paragraphMatches) {
      // Strip inner tags
      const text = match.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text.length > 25) { // Filter out tiny navigational links
        extractedParagraphs.push(text);
      }
    }

    let finalBody = extractedParagraphs.join('\n\n');

    // Fallback if regex missed structured tags
    if (finalBody.length < 150) {
      finalBody = contentHtml
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
    }

    if (finalBody.length < 80) {
      throw new Error('Could not extract readable article text from this URL. The page may require JavaScript or authentication. Please paste the article text manually.');
    }

    return {
      title: title || sourceDomain + ' Article',
      url: articleUrl,
      text: finalBody.slice(0, 30000), // Limit size for safety
      sourceDomain,
    };
  } finally {
    clearTimeout(timeout);
  }
}
