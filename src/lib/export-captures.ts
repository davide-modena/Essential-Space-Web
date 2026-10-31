import type { Card } from '@/types';

/** Copies several captures to the clipboard as Markdown with numbered picture links (for AI chats). */

const AI_NOTE =
  '> Pictures are temporary signed links: download and look at each one before answering.';

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

/** Writes the Markdown to the clipboard as plain text. */
export async function copyCapturesToClipboard(cards: Card[]): Promise<void> {
  await navigator.clipboard.writeText(buildMarkdown(cards));
}
