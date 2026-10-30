import { SiteHeader } from '@/components/site-header';

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-32">
        <h1 className="text-4xl font-normal tracking-tight text-ink">This page is not here.</h1>
        <p className="mt-6 text-sm text-muted">
          <a href="/" className="border-b border-line pb-1 text-ink hover:border-ink">
            Back home
          </a>
        </p>
      </main>
    </>
  );
}
