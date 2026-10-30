'use client';

import { useState } from 'react';
import { downloadBlob, pdfBlob } from '@/lib/pdf/download';
import { errorMessage } from '@/lib/pdf/errors';
import { formatBytes } from '@/lib/pdf/format';
import { mergePdfFiles } from '@/lib/pdf/merge';
import { ToolPanel } from './tool-panel';
import { ToolStatus } from './tool-status';

type SelectedPdf = {
  id: string;
  file: File;
};

function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pdf-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function MergeTool({ headingLevel = 'h2' }: { headingLevel?: 'h1' | 'h2' }) {
  const [files, setFiles] = useState<SelectedPdf[]>([]);
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const list = event.target.files;
    if (!list || list.length === 0) return;
    const next = Array.from(list).map((file) => ({ id: createId(), file }));
    setFiles((current) => [...current, ...next]);
    event.target.value = '';
    setError(null);
    setMessage(null);
  }

  function move(index: number, direction: -1 | 1) {
    setFiles((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const copy = current.slice();
      const item = copy[index];
      const swap = copy[target];
      if (!item || !swap) return current;
      copy[index] = swap;
      copy[target] = item;
      return copy;
    });
  }

  function remove(id: string) {
    setFiles((current) => current.filter((item) => item.id !== id));
  }

  async function onMerge() {
    setWorking(true);
    setError(null);
    setMessage(null);
    setProgress(0);
    try {
      const result = await mergePdfFiles(
        files.map((item) => item.file),
        (update) => {
          setProgress(update.progress);
          setMessage(update.message);
        },
      );
      downloadBlob(pdfBlob(result.bytes), 'merged.pdf');
      const label = result.fileCount === 1 ? '1 PDF' : `${result.fileCount} PDFs`;
      const pages = result.pageCount === 1 ? '1 page' : `${result.pageCount} pages`;
      setMessage(`Merged ${label} into ${pages}. Downloaded merged.pdf.`);
      setProgress(1);
    } catch (caught) {
      setMessage(null);
      setError(errorMessage(caught, 'Could not merge these PDFs.'));
    } finally {
      setWorking(false);
    }
  }

  return (
    <ToolPanel
      id="merge"
      eyebrow="Merge"
      title="Merge PDFs"
      description="Add two or more PDFs. They are read on this device, combined in order, and downloaded. Nothing is uploaded."
      headingLevel={headingLevel}
      busy={working}
    >
      <label className="block text-sm text-muted">
        PDFs, in order
        <input
          className="mt-3 block w-full text-ink file:mr-4 file:border file:border-line file:bg-transparent file:px-3 file:py-2 file:text-sm file:text-ink"
          type="file"
          accept="application/pdf,.pdf"
          multiple
          disabled={working}
          onChange={onPick}
        />
      </label>
      {files.length === 0 ? (
        <p className="mt-6 text-sm text-muted">No files yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {files.map((item, index) => (
            <li key={item.id} className="flex items-center gap-3 py-3 text-sm">
              <span className="w-5 shrink-0 text-muted">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-ink">{item.file.name}</span>
              <span className="shrink-0 text-muted">{formatBytes(item.file.size)}</span>
              <button
                type="button"
                className="text-muted hover:text-ink disabled:opacity-30"
                aria-label={`Move ${item.file.name} up`}
                disabled={working || index === 0}
                onClick={() => move(index, -1)}
              >
                Up
              </button>
              <button
                type="button"
                className="text-muted hover:text-ink disabled:opacity-30"
                aria-label={`Move ${item.file.name} down`}
                disabled={working || index === files.length - 1}
                onClick={() => move(index, 1)}
              >
                Down
              </button>
              <button
                type="button"
                className="text-muted hover:text-ink disabled:opacity-30"
                aria-label={`Remove ${item.file.name}`}
                disabled={working}
                onClick={() => remove(item.id)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="mt-8 border-b border-ink/40 pb-1 text-sm text-ink hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
        disabled={working || files.length < 2}
        onClick={() => {
          void onMerge();
        }}
      >
        Merge PDFs
      </button>
      <ToolStatus working={working} progress={progress} message={message} error={error} />
    </ToolPanel>
  );
}
