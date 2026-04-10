'use client';

import { useState } from 'react';
import { Send, Mail, MessageSquare } from 'lucide-react';

export default function ContactoPage() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // En desarrollo local simplemente simulamos envío
    setSent(true);
    setTimeout(() => setSent(false), 3000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Contacto</h1>
      <p className="text-charcoal/50 mb-10">
        ¿Tienes alguna pregunta, sugerencia o simplemente quieres saludar?
        Me encantaría saber de ti.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">Nombre</label>
          <input id="name" type="text" required className="input-field" placeholder="Tu nombre" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
          <input id="email" type="email" required className="input-field" placeholder="tu@email.com" />
        </div>
        <div>
          <label htmlFor="message" className="block text-sm font-medium mb-2">Mensaje</label>
          <textarea
            id="message"
            required
            rows={5}
            className="input-field resize-none"
            placeholder="Escribe tu mensaje aquí..."
          />
        </div>

        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={sent}>
          {sent ? (
            <>Enviado ✓</>
          ) : (
            <><Send className="w-4 h-4" /> Enviar mensaje</>
          )}
        </button>

        {sent && (
          <p className="text-sm text-sage animate-fade-in">
            ¡Gracias! Tu mensaje ha sido enviado (simulado en localhost).
          </p>
        )}
      </form>
    </div>
  );
}
