'use client';

import { useEffect, useRef, useId } from 'react';

// Tipado mínimo del global window.turnstile que inyecta el script de Cloudflare
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
          theme?: 'light' | 'dark' | 'auto';
          size?: 'normal' | 'flexible' | 'compact';
          appearance?: 'always' | 'execute' | 'interaction-only';
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface TurnstileWidgetProps {
  /** Site key pública de Cloudflare Turnstile */
  siteKey: string;
  /** Se llama cuando el usuario "pasa" el captcha. Recibe el token a enviar al backend. */
  onVerify: (token: string) => void;
  /** Se llama si el captcha falla o expira */
  onError?: () => void;
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/**
 * Widget de Cloudflare Turnstile.
 * Carga el script una sola vez y renderiza el widget.
 */
export default function TurnstileWidget({ siteKey, onVerify, onError }: TurnstileWidgetProps) {
  const containerId = `turnstile-${useId().replace(/:/g, '')}`;
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Cargar script si no existe
    const existingScript = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    // Esperar a que el script esté listo
    const renderWidget = () => {
      if (!window.turnstile) return false;
      const container = document.getElementById(containerId);
      if (!container || container.childNodes.length > 0) return true;

      widgetIdRef.current = window.turnstile.render(`#${containerId}`, {
        sitekey: siteKey,
        callback: (token) => onVerify(token),
        'error-callback': () => onError?.(),
        'expired-callback': () => onError?.(),
        theme: 'auto',
        appearance: 'always', // Invisible salvo si detecta sospecha
      });
      return true;
    };

    if (!renderWidget()) {
      const interval = setInterval(() => {
        if (renderWidget()) clearInterval(interval);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [containerId, siteKey, onVerify, onError]);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Silenciar errores de cleanup
        }
      }
    };
  }, []);

  return <div id={containerId} className="flex justify-center" />;
}
