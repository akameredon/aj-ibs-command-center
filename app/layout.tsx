import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AJ-IBS Command Center',
  description: 'Project intelligence & AI blueprint parser for AJ-IBS Integrated Contractors',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
