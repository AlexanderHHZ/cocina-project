import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Ingrediente 791 — Recetas con Alma',
  description: 'Blog gastronómico con recetas caseras, técnicas y sabores auténticos.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen font-body">
        <Suspense fallback={null}>
          <Navbar />
        </Suspense>
        <main className="pt-24">
          {children}
        </main>
      </body>
    </html>
  );
}
