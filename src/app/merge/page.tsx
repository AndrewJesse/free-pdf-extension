import type { Metadata } from 'next';
import { MergeTool } from '@/components/merge-tool';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: 'Merge',
};

export default function MergePage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto min-h-[70vh] max-w-3xl px-6 py-20">
        <MergeTool headingLevel="h1" />
      </main>
    </>
  );
}
