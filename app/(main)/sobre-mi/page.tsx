import { ChefHat, Heart, Utensils } from 'lucide-react';

export default function SobreMiPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-display text-3xl md:text-4xl font-bold mb-6">Sobre mí</h1>

      <div className="prose-like space-y-6 text-charcoal/70 leading-relaxed">
        <p className="text-lg">
          ¡Hola! Soy el chef detrás de <span className="text-terra font-medium">Ingrediente 791</span>.
          Mi pasión por la gastronomía nació en la cocina de mi abuela, donde los aromas
          de guisos lentos y pan recién horneado llenaban la casa cada fin de semana.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-10">
          {[
            { icon: ChefHat, title: 'Pasión', desc: 'Cocinar es mi forma de expresión artística' },
            { icon: Heart, title: 'Amor', desc: 'Cada receta lleva un pedacito de corazón' },
            { icon: Utensils, title: 'Técnica', desc: 'Fundamentos sólidos, creatividad infinita' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl border border-charcoal/5 p-6 text-center">
              <Icon className="w-8 h-8 text-terra mx-auto mb-3" />
              <h3 className="font-display font-bold mb-1">{title}</h3>
              <p className="text-sm text-charcoal/50">{desc}</p>
            </div>
          ))}
        </div>

        <p>
          Mi misión es compartir recetas accesibles que cualquiera pueda preparar en casa,
          con ingredientes reales y pasos claros. Creo que la buena comida une a las personas
          y que cocinar debería ser un placer, no una obligación.
        </p>

        <p>
          En este blog encontrarás desde recetas rápidas para el día a día hasta elaboraciones
          más ambiciosas para ocasiones especiales. Todas probadas, todas con cariño.
        </p>
      </div>
    </div>
  );
}
