// lib/email-validation.ts
//
// Validación de emails al momento del registro:
// 1. Formato básico (regex sensato)
// 2. Bloqueo de dominios de correos desechables/temporales
//
// Lista ampliable. Fuente de más dominios (opcional):
// https://github.com/disposable-email-domains/disposable-email-domains

const DISPOSABLE_DOMAINS = new Set<string>([
  // Servicios más conocidos de mail temporal
  'tempmail.com',
  'temp-mail.org',
  'temp-mail.io',
  'tempmailo.com',
  'tempail.com',
  'tmpmail.org',
  'tmpmail.net',
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'guerrillamail.info',
  'sharklasers.com',
  'grr.la',
  'mailinator.com',
  'mailinator.net',
  'mailinator2.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'throwawaymail.com',
  'throwaway.email',
  'fakeinbox.com',
  'fakemail.net',
  'trashmail.com',
  'trashmail.net',
  'trashmail.de',
  'getnada.com',
  'nada.email',
  'maildrop.cc',
  'mailnesia.com',
  'mailcatch.com',
  'dispostable.com',
  'mohmal.com',
  'emailondeck.com',
  'tempr.email',
  'discard.email',
  'mail.tm',
  'mail-temp.com',
  'mintemail.com',
  'moakt.com',
  'spam4.me',
  'inboxbear.com',
  'instantemailaddress.com',
  'mytemp.email',
  'getairmail.com',
  'burnermail.io',
  'harakirimail.com',
  'mailnull.com',
  'spamgourmet.com',
  'mvrht.net',
  'trbvm.com',
  'opayq.com',
  'mytrashmail.com',
  'jetable.org',
  'meltmail.com',
]);

export type EmailValidationResult =
  | { ok: true; email: string }
  | { ok: false; error: string };

/**
 * Valida un correo antes de mandarlo a Supabase.
 * - Normaliza (trim + lowercase)
 * - Verifica formato mínimo
 * - Rechaza dominios desechables
 */
export function validateEmail(raw: string): EmailValidationResult {
  const email = raw.trim().toLowerCase();

  if (!email) {
    return { ok: false, error: 'El correo es obligatorio.' };
  }

  // Regex pragmático: algo@algo.algo (2+ caracteres en el TLD)
  // No valida el 100% del RFC 5322 pero descarta basura evidente.
  const formatRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!formatRegex.test(email)) {
    return { ok: false, error: 'El formato del correo no es válido.' };
  }

  const domain = email.split('@')[1];

  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      ok: false,
      error:
        'No se permiten correos temporales. Usa un correo real (Gmail, Outlook, iCloud, etc.).',
    };
  }

  return { ok: true, email };
}

