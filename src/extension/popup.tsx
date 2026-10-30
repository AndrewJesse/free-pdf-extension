import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { CompressTool } from '@/components/compress-tool';
import { MergeTool } from '@/components/merge-tool';

type ToolId = 'merge' | 'compress';

function PopupApp() {
  const [tool, setTool] = useState<ToolId>('merge');

  return (
    <div className="bg-bg px-5 py-5 text-ink">
      <header className="flex items-baseline justify-between">
        <h1 className="text-base font-normal tracking-wide">Free PDF</h1>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">On this device</p>
      </header>
      <div className="mt-6 flex gap-6 text-sm" role="tablist" aria-label="Tools">
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
      <div className="mt-6" role="tabpanel">
        <div hidden={tool !== 'merge'}>
          <MergeTool />
        </div>
        <div hidden={tool !== 'compress'}>
          <CompressTool />
        </div>
      </div>
      <p className="mt-8 text-xs leading-relaxed text-muted">Documents stay in this popup. Nothing is uploaded.</p>
    </div>
  );
}

const root = document.getElementById('root');
if (!root) {
  throw new Error('Missing popup root.');
}
createRoot(root).render(<PopupApp />);
