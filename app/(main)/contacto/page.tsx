'use client';

import { useState } from 'react';
import { Send, Mail } from 'lucide-react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

// ============================================
// CONFIGURA TUS REDES SOCIALES AQUÍ
// ============================================
const SOCIAL_LINKS = {
  youtube:  'https://www.youtube.com/@Ingrediente791',
  facebook: 'https://facebook.com/TU_PAGINA',
  x:        'https://x.com/TU_USUARIO',
  email:    'tu@email.com',
};

export default function ContactoPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const supabase = createSupabaseBrowser();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    const { error } = await supabase
      .from('contact_messages')
      .insert({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });

    if (error) {
      console.error('[Contacto] Error:', error);
      setStatus('error');
    } else {
      setStatus('sent');
      setName('');
      setEmail('');
      setMessage('');
    }
  };

  const socials = [
    {
      name: 'YouTube',
      href: SOCIAL_LINKS.youtube,
      color: 'hover:bg-red-50 hover:text-red-600 hover:border-red-200',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
        </svg>
      ),
    },
    {
      name: 'Facebook',
      href: SOCIAL_LINKS.facebook,
      color: 'hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      ),
    },
    {
      name: 'X',
      href: SOCIAL_LINKS.x,
      color: 'hover:bg-charcoal/5 hover:text-charcoal hover:border-charcoal/20',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
    },
    {
      name: 'Email',
      href: `mailto:${SOCIAL_LINKS.email}`,
      color: 'hover:bg-terra/5 hover:text-terra hover:border-terra/20',
      icon: <Mail className="w-5 h-5" />,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-display text-3xl md:text-4xl font-bold mb-3">Contacto</h1>
      <p className="text-charcoal/50 mb-10">
        ¿Tienes alguna pregunta, sugerencia o simplemente quieres saludar?
        Me encantaría saber de ti.
      </p>

      {/* Redes sociales */}
      <div className="mb-12">
        <h2 className="font-display text-lg font-bold mb-4">Encuéntrame en</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {socials.map((social) => (
            <a
              key={social.name}
              href={social.href}
              target={social.name === 'Email' ? undefined : '_blank'}
              rel={social.name === 'Email' ? undefined : 'noopener noreferrer'}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border border-charcoal/10
                         text-charcoal/50 transition-all duration-200 ${social.color}`}
            >
              {social.icon}
              <span className="text-xs font-medium">{social.name}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Separador */}
      <div className="flex items-center gap-4 mb-10">
        <div className="flex-1 h-px bg-charcoal/10" />
        <span className="text-sm text-charcoal/30 font-medium">o envíame un mensaje</span>
        <div className="flex-1 h-px bg-charcoal/10" />
      </div>

      {status === 'sent' ? (
        <div className="bg-sage/10 rounded-2xl p-8 text-center animate-fade-in">
          <div className="w-14 h-14 bg-sage/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-6 h-6 text-sage" />
          </div>
          <h2 className="font-display text-xl font-bold mb-2">¡Mensaje enviado!</h2>
          <p className="text-charcoal/60 text-sm mb-6">
            Gracias por escribirme. Te responderé lo antes posible.
          </p>
          <button
            onClick={() => setStatus('idle')}
            className="btn-secondary text-sm"
          >
            Enviar otro mensaje
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">Nombre</label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field"
              placeholder="Tu nombre"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="tu@email.com"
            />
          </div>
          <div>
            <label htmlFor="message" className="block text-sm font-medium mb-2">Mensaje</label>
            <textarea
              id="message"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="input-field resize-none"
              placeholder="Escribe tu mensaje aquí..."
            />
          </div>

          {status === 'error' && (
            <p className="text-sm text-wine animate-fade-in">
              Hubo un error al enviar. Intenta de nuevo.
            </p>
          )}

          <button
            type="submit"
            className="btn-primary w-full sm:w-auto"
            disabled={status === 'sending'}
          >
            {status === 'sending' ? (
              'Enviando...'
            ) : (
              <><Send className="w-4 h-4" /> Enviar mensaje</>
            )}
          </button>
        </form>
      )}
    </div>
  );
}