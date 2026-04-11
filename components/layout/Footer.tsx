import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-charcoal text-white/70 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="mb-3">
              <img
                src="/images/logo.webp"
                alt="Ingrediente 791"
                className="h-12 w-auto brightness-0 invert"
              />
            </div>
            <p className="text-sm leading-relaxed">
              Recetas caseras con amor, compartidas para inspirar tu mesa de cada día.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-display font-bold text-white mb-3">Navegación</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link href="/recetas" className="hover:text-terra transition-colors">Recetas</Link>
              <Link href="/sobre-mi" className="hover:text-terra transition-colors">Sobre mí</Link>
              <Link href="/contacto" className="hover:text-terra transition-colors">Contacto</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display font-bold text-white mb-3">Legal</h4>
            <p className="text-sm">© {new Date().getFullYear()} Mi Cocina. Todos los derechos reservados.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
