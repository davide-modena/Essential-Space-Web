import type { Card } from '@/types';

/**
 * Copies several captures to the clipboard as Markdown, for pasting into AI chats.
 * Only the essentials: date, the user's note and the numbered picture link.
 */

const AI_NOTE =
  '> Pictures are temporary signed links: download and look at each one before answering.';

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function buildMarkdown(cards: Card[]): string {
  let pictureNo = 0;
  const sections = cards.map((card, i) => {
    const pictureUrl = card.cachedImageUrl || card.imageUrl;
    const lines = [`## Capture ${i + 1}`, `_${formatDate(card.createTime)}_`];
    const note = card.content?.trim();
    if (note) {
      lines.push('', note.includes('\n') ? `**Note:**\n${note}` : `**Note:** ${note}`);
    }
    if (pictureUrl) lines.push('', `![Picture #${++pictureNo}](${pictureUrl})`);
    return { lines, hasPicture: Boolean(pictureUrl) };
  });

  const out: string[] = [`# ${cards.length} capture${cards.length === 1 ? '' : 's'}`];
  if (sections.some(s => s.hasPicture)) out.push('', AI_NOTE);
  for (const s of sections) out.push('', ...s.lines);
  return out.join('\n') + '\n';
}

/** Writes the Markdown to the clipboard as plain text. */
export async function copyCapturesToClipboard(cards: Card[]): Promise<void> {
  await navigator.clipboard.writeText(buildMarkdown(cards));
}
