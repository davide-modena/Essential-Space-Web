'use client';

import { useEffect, useState } from 'react';
import { Copy, Check, Loader2, X } from 'lucide-react';
import { copyImageToClipboard } from '@/lib/copy-image';

type Status = 'idle' | 'copying' | 'done' | 'error';

const LABELS: Record<Status, string> = {
  idle: 'Copy',
  copying: 'Copying...',
  done: 'Copied',
  error: 'Failed',
};

export default function CopyImageButton({
  url,
  className = '',
  showLabel = true,
}: {
  url: string;
  className?: string;
  showLabel?: boolean;
}) {
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    if (status === 'idle' || status === 'copying') return;
    const t = setTimeout(() => setStatus('idle'), 1800);
    return () => clearTimeout(t);
  }, [status]);

  const handleClick = async (e: React.MouseEvent) => {
    // Don't open the card / close the lightbox
    e.stopPropagation();
    if (status === 'copying') return;
    setStatus('copying');
    try {
      await copyImageToClipboard(url);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const Icon =
    status === 'copying' ? Loader2 :
    status === 'done' ? Check :
    status === 'error' ? X : Copy;

  return (
    <button
      type="button"
      onClick={handleClick}
      title="Copy image to clipboard"
      aria-label={LABELS[status]}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/75 backdrop-blur border border-nothing-border text-[11px] font-mono text-white hover:border-nothing-red hover:text-nothing-red transition-colors cursor-pointer ${
        status === 'done' ? '!text-emerald-500 !border-emerald-500/60' : ''
      } ${status === 'error' ? '!text-nothing-red !border-nothing-red' : ''} ${className}`}
    >
      <Icon size={12} className={status === 'copying' ? 'animate-spin' : ''} />
      {showLabel && <span>{LABELS[status]}</span>}
    </button>
  );
}
