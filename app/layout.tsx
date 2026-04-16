import type { Metadata } from 'next';
import { Lora, Poppins, Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/layout/Navbar';
import { Suspense } from 'react';

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-lora',
  display: 'swap',
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-poppins',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

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
      <body className={`${lora.variable} ${poppins.variable} ${inter.variable} min-h-screen font-body`}>
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
