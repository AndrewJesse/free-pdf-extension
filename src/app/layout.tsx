import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Free PDF',
    template: '%s — Free PDF',
  },
  description: 'Merge and compress PDFs locally. Your documents never touch a cloud server.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
