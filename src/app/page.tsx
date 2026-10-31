import { CompressTool } from '@/components/compress-tool';
import { MergeTool } from '@/components/merge-tool';
import { SiteHeader } from '@/components/site-header';

const HERO = '100% Local-First. Your documents never touch a cloud server.';

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="mx-auto flex min-h-[78vh] max-w-3xl flex-col justify-center px-5 py-16 sm:px-6 sm:py-24">
          <p className="text-[11px] uppercase tracking-[0.28em] text-muted">Free PDF</p>
          <h1 className="mt-8 max-w-full text-balance text-[2rem] font-normal leading-[1.12] tracking-[-0.03em] text-ink sm:text-6xl">
            {HERO}
          </h1>
          <p className="mt-8 max-w-md text-base leading-relaxed text-muted">
            Merge and compress in this browser. The extension popup runs the same code.
          </p>
          <nav className="mt-14 flex flex-wrap gap-x-10 gap-y-4 text-lg" aria-label="Open a tool">
            <a href="/merge" className="border-b border-ink/30 pb-1 text-ink hover:border-ink">
              Merge
            </a>
            <a href="/compress" className="border-b border-ink/30 pb-1 text-ink hover:border-ink">
              Compress
            </a>
          </nav>
        </section>
        <section className="border-t border-line">
          <div className="mx-auto max-w-3xl px-6 py-24">
            <MergeTool />
          </div>
        </section>
        <section className="border-t border-line">
          <div className="mx-auto max-w-3xl px-6 py-24">
            <CompressTool />
          </div>
        </section>
      </main>
      <footer className="border-t border-line px-6 py-16 text-xs leading-relaxed text-muted sm:px-10">
        <p>No account. No server. No network calls for your documents.</p>
        <p className="mt-3">
          <a href="https://free-utils.com" className="text-ink underline underline-offset-2">
            https://free-utils.com
          </a>
        </p>
      </footer>
    </>
  );
}
