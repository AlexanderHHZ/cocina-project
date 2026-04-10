import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mi Cocina — Recetas con Alma',
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
        {children}
      </body>
    </html>
  );
}
