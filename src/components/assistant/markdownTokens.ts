/**
 * Tiny, dependency-free Markdown subset for chat messages (the AI answers in Markdown).
 * Pure functions only: the React layer turns these tokens into elements, so nothing is ever
 * injected as HTML.
 *
 * Supported: **bold**, `code`, "#"..."######" headings, "- "/"* "/"• " bullets, "1. " lists.
 */

export type InlineToken =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'code'; value: string };

export type BlockToken =
  | { kind: 'blank' }
  | { kind: 'heading'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'numbered'; marker: string; text: string }
  | { kind: 'paragraph'; text: string };

const INLINE_RE = /(\*\*[^*\n]+\*\*|`[^`\n]+`)/g;

export function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  for (const part of text.split(INLINE_RE)) {
    if (!part) continue;
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      tokens.push({ kind: 'bold', value: part.slice(2, -2) });
    } else if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      tokens.push({ kind: 'code', value: part.slice(1, -1) });
    } else {
      tokens.push({ kind: 'text', value: part });
    }
  }
  return tokens;
}

export function tokenizeBlocks(content: string): BlockToken[] {
  return content.split('\n').map((raw): BlockToken => {
    const line = raw.trimEnd();
    if (!line.trim()) return { kind: 'blank' };

    const heading = /^\s{0,3}#{1,6}\s+(.*)$/.exec(line);
    if (heading) return { kind: 'heading', text: heading[1].replace(/\s+#+\s*$/, '') };

    const bullet = /^\s*[-*•]\s+(.*)$/.exec(line);
    if (bullet) return { kind: 'bullet', text: bullet[1] };

    const numbered = /^\s*(\d{1,3}[.)])\s+(.*)$/.exec(line);
    if (numbered) return { kind: 'numbered', marker: numbered[1], text: numbered[2] };

    return { kind: 'paragraph', text: line };
  });
}
