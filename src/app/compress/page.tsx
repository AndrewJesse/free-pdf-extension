import type { Metadata } from 'next';
import { CompressTool } from '@/components/compress-tool';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Compress',
};

export default function CompressPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[70vh] max-w-3xl px-6 py-20">
        <CompressTool headingLevel="h1" />
      </main>
    </>
  );
}
