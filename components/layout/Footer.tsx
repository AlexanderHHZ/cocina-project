import Link from 'next/link';
import { ChefHat, Youtube, Instagram, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-walnut text-white/70 mt-20">
      {/* ── Contenido principal ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">

          {/* Brand */}
          <div className="md:col-span-5">
            <h3 className="font-display text-lg font-bold text-white mb-3">Ingrediente 791</h3>
            <p className="text-sm leading-relaxed max-w-sm">
              Recetas caseras con amor, compartidas para inspirar tu mesa de cada día.
              Desde la cocina de siempre hasta tu hogar.
            </p>
            {/* Redes sociales */}
            <div className="flex items-center gap-3 mt-5">
              <a
                href="https://youtube.com/@ingrediente791"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500/80 flex items-center justify-center transition-colors duration-200"
                aria-label="YouTube"
              >
                <Youtube className="w-4 h-4 text-white" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-pink-500/80 flex items-center justify-center transition-colors duration-200"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4 text-white" />
              </a>
              <a
                href="#"
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-blue-600/80 flex items-center justify-center transition-colors duration-200"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4 text-white" />
              </a>
            </div>
          </div>

          {/* Navegación */}
          <div className="md:col-span-3">
            <h4 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-4">
              Navegación
            </h4>
            <nav className="flex flex-col gap-2.5 text-sm font-ui">
              <Link href="/" className="hover:text-white hover:translate-x-1 transition-all duration-150">
                Inicio
              </Link>
              <Link href="/recetas" className="hover:text-white hover:translate-x-1 transition-all duration-150">
                Recetas
              </Link>
              <Link href="/blog" className="hover:text-white hover:translate-x-1 transition-all duration-150">
                Blog
              </Link>
              <Link href="/sobre-mi" className="hover:text-white hover:translate-x-1 transition-all duration-150">
                Sobre mí
              </Link>
              <Link href="/contacto" className="hover:text-white hover:translate-x-1 transition-all duration-150">
                Contacto
              </Link>
            </nav>
          </div>

          {/* Contacto */}
          <div className="md:col-span-4">
            <h4 className="font-display font-bold text-white text-sm uppercase tracking-wider mb-4">
              Contacto
            </h4>
            <div className="space-y-3 text-sm font-ui">
              <p>¿Tienes alguna pregunta o sugerencia?</p>
              <Link
                href="/contacto"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 hover:bg-paprika text-white text-sm font-medium transition-colors duration-200"
              >
                Escríbenos
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Barra inferior ── */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs font-ui text-white/40">
              © {new Date().getFullYear()} Ingrediente 791. Todos los derechos reservados.
            </p>
            <p className="text-xs font-ui text-white/40">
              Desarrollado por:{' '}
              <span className="text-white/60 font-medium">Softium Systems</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
