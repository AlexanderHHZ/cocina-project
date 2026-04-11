import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Suspense } from 'react';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <main className="pt-24 min-h-screen">
        {children}
      </main>
      <Footer />
    </>
  );
}
