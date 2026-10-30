const links = [
  { href: '/merge', label: 'Merge' },
  { href: '/compress', label: 'Compress' },
] as const;

export function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-5 text-sm sm:px-10">
      <a href="/" className="tracking-wide text-ink">
        Free PDF
      </a>
      <nav className="flex items-center gap-6 text-muted" aria-label="Tools">
        {links.map((link) => (
          <a key={link.href} href={link.href} className="hover:text-ink">
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
