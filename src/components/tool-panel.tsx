import type { ReactNode } from 'react';

export function ToolPanel({
  id,
  eyebrow,
  title,
  description,
  headingLevel = 'h2',
  busy = false,
  compact = false,
  children,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  headingLevel?: 'h1' | 'h2';
  busy?: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  const Heading = headingLevel;
  return (
    <section id={id} aria-busy={busy} className="max-w-xl min-w-0">
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted">{eyebrow}</p>
      <Heading className={compact ? 'mt-2 text-2xl font-normal tracking-tight text-ink' : 'mt-3 text-3xl font-normal tracking-tight text-ink'}>
        {title}
      </Heading>
      <p className="mt-4 text-sm leading-relaxed text-muted">{description}</p>
      <div className={compact ? 'mt-5' : 'mt-8'}>{children}</div>
    </section>
  );
}
