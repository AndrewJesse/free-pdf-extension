'use client';

import { useState } from 'react';
import { compressPdfFile } from '@/lib/pdf/compress';
import { downloadBlob, pdfBlob } from '@/lib/pdf/download';
import { errorMessage } from '@/lib/pdf/errors';
import { formatBytes, safeBaseName } from '@/lib/pdf/format';
import { assertPdf, readFileBytes } from '@/lib/pdf/read-file';
import { ToolPanel } from './tool-panel';
import { ToolStatus } from './tool-status';

export function CompressTool({
  headingLevel = 'h2',
  compact = false,
}: {
  headingLevel?: 'h1' | 'h2';
  compact?: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0] ?? null;
    event.target.value = '';
    setMessage(null);
    if (!next) return;
    try {
      assertPdf(await readFileBytes(next), next.name);
      setFile(next);
      setError(null);
    } catch (caught) {
      setFile(null);
      setError(errorMessage(caught, `${next.name} is not a PDF.`));
    }
  }

  async function onCompress() {
    if (!file) {
      setMessage(null);
      setError('Choose a PDF to compress.');
      return;
    }
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
      compact={compact}
      busy={working}
    >
      <label className="file-field">
        <span>PDF</span>
        <input
          type="file"
          accept="application/pdf,.pdf"
          disabled={working}
          onChange={(event) => {
            void onPick(event);
          }}
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
        className="action-button"
        disabled={working}
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
