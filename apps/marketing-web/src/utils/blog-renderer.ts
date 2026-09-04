export interface TocItem {
  id: string;
  text: string;
  level: number;
}

export interface RenderedBlog {
  html: string;
  toc: TocItem[];
}

/**
 * Parses markdown into HTML and extracts structured Table of Contents (TOC)
 */
export function renderBlogMarkdown(markdown: string): RenderedBlog {
  if (!markdown) {
    return { html: '', toc: [] };
  }

  const toc: TocItem[] = [];
  const headingCounts: Record<string, number> = {};

  // Normalize newlines
  let src = markdown.replace(/\r\n/g, '\n');

  // Pre-process code blocks to prevent parsing markdown inside them
  const codeBlocks: string[] = [];
  src = src.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
    const escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    codeBlocks.push(
      `<div class="my-6 rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800 bg-slate-900 text-slate-100 shadow-md">
        ${lang ? `<div class="px-4 py-1.5 bg-slate-800/80 text-[11px] font-mono text-slate-400 uppercase tracking-wider border-b border-slate-700/50 flex items-center justify-between"><span>${lang}</span></div>` : ''}
        <pre class="p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed"><code>${escaped}</code></pre>
      </div>`
    );
    return placeholder;
  });

  // Pre-process tables
  src = src.replace(/(?:\|[^\n]+\|\r?\n)((?:\|(?:\s*:?-+:?\s*\|)+\r?\n))((?:\|[^\n]+\|\r?\n?)+)/g, (fullMatch) => {
    const rows = fullMatch.trim().split('\n').map(r => r.trim());
    if (rows.length < 2) return fullMatch;

    const parseCells = (row: string) =>
      row.replace(/^\||\|$/g, '').split('|').map(c => c.trim());

    const headerCells = parseCells(rows[0]);
    // row[1] is separator |:---|:---|
    const bodyRows = rows.slice(2).map(r => parseCells(r));

    let tableHtml = `<div class="my-8 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm">
      <table class="w-full text-left text-sm border-collapse">
        <thead class="bg-slate-100/80 dark:bg-slate-800/80 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
          <tr>${headerCells.map(c => `<th class="py-3 px-4">${formatInline(c)}</th>`).join('')}</tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
          ${bodyRows.map(row => `
            <tr class="hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors">
              ${row.map(c => `<td class="py-3.5 px-4 text-slate-600 dark:text-slate-300">${formatInline(c)}</td>`).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>`;

    return tableHtml;
  });

  // Process Headings & build TOC
  src = src.replace(/^(#{1,4})\s+(.+)$/gm, (_, hashes, rawText) => {
    const depth = hashes.length;
    const cleanText = rawText.replace(/<[^>]+>/g, '').trim();

    let slug = cleanText
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    if (!slug) slug = `section-${depth}`;

    if (headingCounts[slug]) {
      headingCounts[slug]++;
      slug = `${slug}-${headingCounts[slug]}`;
    } else {
      headingCounts[slug] = 1;
    }

    if (depth === 2 || depth === 3) {
      toc.push({
        id: slug,
        text: cleanText,
        level: depth,
      });
    }

    const inlineHtml = formatInline(rawText);

    if (depth === 1) {
      return `<h1 id="${slug}" class="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white mt-12 mb-6 scroll-mt-24 tracking-tight">${inlineHtml}</h1>`;
    } else if (depth === 2) {
      return `<h2 id="${slug}" class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-12 mb-4 scroll-mt-24 tracking-tight pb-2 border-b border-slate-200/60 dark:border-slate-800/60 group relative flex items-center justify-between">
        <a href="#${slug}" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">${inlineHtml}</a>
        <a href="#${slug}" class="opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-indigo-600 transition-opacity text-base font-normal pl-2" aria-hidden="true">#</a>
      </h2>`;
    } else if (depth === 3) {
      return `<h3 id="${slug}" class="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-3 scroll-mt-24 tracking-tight group relative flex items-center justify-between">
        <a href="#${slug}" class="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">${inlineHtml}</a>
        <a href="#${slug}" class="opacity-0 group-hover:opacity-100 text-indigo-400 hover:text-indigo-600 transition-opacity text-sm font-normal pl-2" aria-hidden="true">#</a>
      </h3>`;
    } else {
      return `<h4 id="${slug}" class="text-lg font-bold text-slate-800 dark:text-slate-100 mt-6 mb-2 scroll-mt-24">${inlineHtml}</h4>`;
    }
  });

  // Blockquotes
  src = src.replace(/^>\s+(.+)$/gm, (_, quote) => {
    return `<blockquote class="border-l-4 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 py-3 px-5 my-6 rounded-r-xl italic text-slate-700 dark:text-slate-300 shadow-sm">${formatInline(quote)}</blockquote>`;
  });

  // Horizontal Rules
  src = src.replace(/^(?:---|___|\*\*\*)$/gm, '<hr class="my-10 border-t border-slate-200 dark:border-slate-800" />');

  // Unordered Lists
  src = src.replace(/(?:^[*-]\s+.+\n?)+/gm, (listMatch) => {
    const items = listMatch.trim().split('\n').map(l => l.replace(/^[*-]\s+/, '').trim());
    return `<ul class="space-y-2.5 my-5 pl-2">
      ${items.map(i => `
        <li class="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 leading-relaxed">
          <span class="inline-block w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-2.5 shrink-0"></span>
          <span>${formatInline(i)}</span>
        </li>
      `).join('')}
    </ul>`;
  });

  // Ordered Lists
  src = src.replace(/(?:^\d+\.\s+.+\n?)+/gm, (listMatch) => {
    const items = listMatch.trim().split('\n').map(l => l.replace(/^\d+\.\s+/, '').trim());
    return `<ol class="space-y-2.5 my-5 pl-2 counter-reset-list">
      ${items.map((i, idx) => `
        <li class="flex items-start gap-3 text-slate-700 dark:text-slate-300 leading-relaxed">
          <span class="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center justify-center mt-0.5 shrink-0">${idx + 1}</span>
          <span>${formatInline(i)}</span>
        </li>
      `).join('')}
    </ol>`;
  });

  // Paragraphs (split by 2 or more newlines, ignore blocks starting with HTML tags or placeholders)
  const blocks = src.split(/\n\s*\n/);
  const processedBlocks = blocks.map(block => {
    const trimmed = block.trim();
    if (!trimmed) return '';
    if (
      trimmed.startsWith('<h') ||
      trimmed.startsWith('<div') ||
      trimmed.startsWith('<blockquote') ||
      trimmed.startsWith('<hr') ||
      trimmed.startsWith('<ul') ||
      trimmed.startsWith('<ol') ||
      trimmed.startsWith('__CODE_BLOCK_')
    ) {
      return trimmed;
    }
    return `<p class="my-4 text-base sm:text-lg leading-relaxed text-slate-700 dark:text-slate-300 font-normal">${formatInline(trimmed)}</p>`;
  });

  let html = processedBlocks.filter(Boolean).join('\n\n');

  // Restore Code Blocks
  codeBlocks.forEach((codeHtml, idx) => {
    html = html.replace(`__CODE_BLOCK_${idx}__`, codeHtml);
  });

  return { html, toc };
}

/**
 * Helper to format inline markdown (bold, italic, code, links)
 */
function formatInline(text: string): string {
  if (!text) return '';
  return text
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 font-mono text-sm border border-slate-200/60 dark:border-slate-700/60">$1</code>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-950 dark:text-white">$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 underline underline-offset-4 decoration-indigo-300 dark:decoration-indigo-700 hover:decoration-indigo-600 transition-colors" target="_blank" rel="noopener noreferrer">$1</a>');
}

/**
 * Safely parses string or array fields from PostgreSQL JSON/text columns
 */
export function safeParseJson<T>(value: any, fallback: T): T {
  if (!value) return fallback;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
