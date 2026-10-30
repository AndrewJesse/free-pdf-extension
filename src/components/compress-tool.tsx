'use client';

import { useState } from 'react';
import { compressPdfFile } from '@/lib/pdf/compress';
import { downloadBlob, pdfBlob } from '@/lib/pdf/download';
import { errorMessage } from '@/lib/pdf/errors';
import { formatBytes, safeBaseName } from '@/lib/pdf/format';
import { ToolPanel } from './tool-panel';
import { ToolStatus } from './tool-status';

export function CompressTool({ headingLevel = 'h2' }: { headingLevel?: 'h1' | 'h2' }) {
  const [file, setFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    setFile(next);
    event.target.value = '';
    setError(null);
    setMessage(null);
  }

  async function onCompress() {
    if (!file) return;
    setWorking(true);
    setError(null);
    setMessage(null);
    setProgress(0);
    try {
      const result = await compressPdfFile(file, (update) => {
        setProgress(update.progress);
        setMessage(update.message);
      });
      if (result.changed) {
        downloadBlob(pdfBlob(result.bytes), `${safeBaseName(file.name)}.compressed.pdf`);
      }
      setMessage(result.message);
      setProgress(1);
    } catch (caught) {
      setMessage(null);
      setError(errorMessage(caught, 'Could not compress this PDF.'));
    } finally {
      setWorking(false);
    }
  }

  return (
    <ToolPanel
      id="compress"
      eyebrow="Compress"
      title="Compress a PDF"
      description="Embedded images are redrawn at a lower resolution and re-encoded on this device. If a PDF has no images, its pages stay as they are."
      headingLevel={headingLevel}
      busy={working}
    >
      <label className="block text-sm text-muted">
        PDF
        <input
          className="mt-3 block w-full text-ink file:mr-4 file:border file:border-line file:bg-transparent file:px-3 file:py-2 file:text-sm file:text-ink"
          type="file"
          accept="application/pdf,.pdf"
          disabled={working}
          onChange={onPick}
        />
      </label>
      <p className="mt-6 text-sm text-muted">
        {file ? (
          <>
            <span className="text-ink">{file.name}</span>
            <span> · {formatBytes(file.size)}</span>
          </>
        ) : (
          'No file yet.'
        )}
      </p>
      <button
        type="button"
        className="mt-8 border-b border-ink/40 pb-1 text-sm text-ink hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
        disabled={working || !file}
        onClick={() => {
          void onCompress();
        }}
      >
        Compress PDF
      </button>
      <ToolStatus working={working} progress={progress} message={message} error={error} />
    </ToolPanel>
  );
}
