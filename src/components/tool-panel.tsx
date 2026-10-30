import type { ReactNode } from 'react';

export function ToolPanel({
  id,
  eyebrow,
  title,
  description,
  headingLevel = 'h2',
  busy = false,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  headingLevel?: 'h1' | 'h2';
  busy?: boolean;
  children: ReactNode;
}) {
  const Heading = headingLevel;
  return (
    <section id={id} aria-busy={busy} className="max-w-xl">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{eyebrow}</p>
      <Heading className="mt-3 text-3xl font-normal tracking-tight text-ink">{title}</Heading>
      <p className="mt-4 text-sm leading-relaxed text-muted">{description}</p>
      <div className="mt-8">{children}</div>
    </section>
  );
}
