import type { Card } from '@/types';
import { fetchImageBlob } from './copy-image';

/**
 * Copies several captures to the clipboard in one go:
 * - text/plain: Markdown with numbered picture links (for Claude Code / AI chats)
 * - text/html: same content with the pictures embedded (for Docs, Notion, email)
 */

const AI_NOTE =
  '> Pictures are temporary signed links: download and look at each one before answering.';

/** Longest side of embedded pictures, keeps the HTML clipboard reasonably small. */
const MAX_EMBED_SIDE = 1600;

interface Section {
  card: Card;
  pictureNo?: number;
  pictureUrl?: string;
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Text blocks of a card as [label, value] pairs (shared by Markdown and HTML). */
function cardFields(card: Card): Array<{ label: string; text?: string; list?: string[] }> {
  const fields: Array<{ label: string; text?: string; list?: string[] }> = [];
  const collections = card.collectionNames?.length
    ? card.collectionNames
    : card.collectionName
      ? [card.collectionName]
      : [];

  if (collections.length) fields.push({ label: 'Collection', text: collections.join(', ') });
  if (card.tags?.length) fields.push({ label: 'Tags', text: card.tags.join(', ') });
  if (card.content && card.content !== card.summary) fields.push({ label: 'Note', text: card.content });
  if (card.summary) fields.push({ label: 'Summary', text: card.summary });
  if (card.bulletPoints?.length) {
    fields.push({ label: card.bulletPointsTitle || 'Key points', list: card.bulletPoints });
  }
  if (card.infoExtract?.length) {
    fields.push({ label: 'Extracted info', list: card.infoExtract.map(i => `${i.title}: ${i.value}`) });
  }
  if (card.events?.length) {
    fields.push({
      label: 'Tasks',
      list: card.events.map(e => `[${e.check ? 'x' : ' '}] ${e.title}${e.content ? ` — ${e.content}` : ''}`),
    });
  }
  if (card.audio?.transcript && !card.audio.transcript.startsWith('http')) {
    fields.push({ label: 'Transcript', text: card.audio.transcript });
  }
  if (card.link?.url) {
    fields.push({ label: 'Link', text: [card.link.title, card.link.url].filter(Boolean).join(' — ') });
  }
  if (card.locations?.length) {
    fields.push({ label: 'Location', list: card.locations.map(l => l.locationName) });
  }
  return fields;
}

function buildSections(cards: Card[]): Section[] {
  let n = 0;
  return cards.map(card => {
    const pictureUrl = card.cachedImageUrl || card.imageUrl;
    return pictureUrl ? { card, pictureUrl, pictureNo: ++n } : { card };
  });
}

function heading(card: Card, i: number): string {
  return `Capture ${i + 1}${card.title ? ` — ${card.title}` : ''}`;
}

export function buildMarkdown(cards: Card[]): string {
  const sections = buildSections(cards);
  const hasPictures = sections.some(s => s.pictureUrl);
  const out: string[] = [`# ${cards.length} capture${cards.length === 1 ? '' : 's'}`];
  if (hasPictures) out.push('', AI_NOTE);

  sections.forEach(({ card, pictureNo, pictureUrl }, i) => {
    out.push('', `## ${heading(card, i)}`, `_${formatDate(card.createTime)}_`);
    for (const f of cardFields(card)) {
      if (f.list) {
        out.push('', `**${f.label}:**`, ...f.list.map(item => `- ${item}`));
      } else if (f.text) {
        out.push('', f.text.includes('\n') ? `**${f.label}:**\n${f.text}` : `**${f.label}:** ${f.text}`);
      }
    }
    if (pictureUrl) out.push('', `![Picture #${pictureNo}](${pictureUrl})`);
  });

  return out.join('\n') + '\n';
}

/** Downloads a picture and returns it as a (downscaled) data: URI, or the URL on failure. */
async function embedPicture(url: string): Promise<string> {
  try {
    const blob = await fetchImageBlob(url);
    const bitmap = await createImageBitmap(blob);
    const scale = Math.min(1, MAX_EMBED_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return url;
  }
}

export async function buildHtml(cards: Card[]): Promise<string> {
  const sections = buildSections(cards);
  const pictures = await Promise.all(
    sections.map(s => (s.pictureUrl ? embedPicture(s.pictureUrl) : Promise.resolve(undefined)))
  );

  const parts: string[] = [`<h1>${cards.length} capture${cards.length === 1 ? '' : 's'}</h1>`];
  sections.forEach(({ card, pictureNo }, i) => {
    parts.push(`<h2>${escapeHtml(heading(card, i))}</h2>`, `<p><em>${escapeHtml(formatDate(card.createTime))}</em></p>`);
    for (const f of cardFields(card)) {
      if (f.list) {
        parts.push(
          `<p><strong>${escapeHtml(f.label)}:</strong></p><ul>${f.list.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`
        );
      } else if (f.text) {
        parts.push(`<p><strong>${escapeHtml(f.label)}:</strong> ${escapeHtml(f.text).replace(/\n/g, '<br>')}</p>`);
      }
    }
    const src = pictures[i];
    if (src) {
      parts.push(
        `<p><img src="${escapeHtml(src)}" alt="Picture #${pictureNo}" style="max-width:100%"><br><em>Picture #${pictureNo}</em></p>`
      );
    }
  });

  return `<meta charset="utf-8">${parts.join('\n')}`;
}

/** Writes Markdown (plain text) and HTML (embedded pictures) to the clipboard together. */
export async function copyCapturesToClipboard(cards: Card[]): Promise<void> {
  const markdown = buildMarkdown(cards);

  if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
    try {
      // Promises keep the user gesture alive while pictures download (Safari)
      const html = buildHtml(cards).then(h => new Blob([h], { type: 'text/html' }));
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([markdown], { type: 'text/plain' }),
          'text/html': html,
        }),
      ]);
      return;
    } catch {
      // fall back to Markdown only
    }
  }
  await navigator.clipboard.writeText(markdown);
}
