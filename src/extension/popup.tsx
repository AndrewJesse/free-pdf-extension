import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CompressTool } from '@/components/compress-tool';
import { MergeTool } from '@/components/merge-tool';

type ToolId = 'merge' | 'compress';

function PopupApp() {
  const [tool, setTool] = useState<ToolId>('merge');

  return (
    <div className="bg-bg px-5 py-5 text-ink">
      <header className="flex items-center justify-between gap-3">
        <h1 className="flex items-center gap-2 text-base font-normal tracking-wide">
          <img src="icons/icon-32.png" alt="" width={22} height={22} className="h-[22px] w-[22px]" />
          Free PDF
        </h1>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">On this device</p>
      </header>
      <div className="mt-4 flex gap-6 text-sm" role="tablist" aria-label="Tools">
        <button
          type="button"
          role="tab"
          aria-selected={tool === 'merge'}
          className={tool === 'merge' ? 'border-b border-ink pb-1 text-ink' : 'pb-1 text-muted'}
          onClick={() => setTool('merge')}
        >
          Merge
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tool === 'compress'}
          className={tool === 'compress' ? 'border-b border-ink pb-1 text-ink' : 'pb-1 text-muted'}
          onClick={() => setTool('compress')}
        >
          Compress
        </button>
      </div>
      <div className="mt-4" role="tabpanel">
        <div hidden={tool !== 'merge'}>
          <MergeTool compact />
        </div>
        <div hidden={tool !== 'compress'}>
          <CompressTool compact />
        </div>
      </div>
      <footer className="mt-6 space-y-2 text-xs leading-relaxed text-muted">
        <p>Documents stay in this popup. Nothing is uploaded.</p>
        <p>
          <a
            className="text-ink underline underline-offset-2"
            href="https://free-utils.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://free-utils.com
          </a>
        </p>
      </footer>
    </div>
  );
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing popup root.');
}
createRoot(root).render(<PopupApp />);
