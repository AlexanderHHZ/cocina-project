'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Camera, Loader2, CheckCircle, X } from 'lucide-react';

interface Props {
  currentPhotoUrl: string | null;
}

export default function ChefPhotoUpload({ currentPhotoUrl }: Props) {
  const [preview, setPreview]     = useState<string | null>(currentPhotoUrl);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error, setError]         = useState('');
  const inputRef                  = useRef<HTMLInputElement>(null);
  const router                    = useRouter();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validaciones rápidas en cliente (el servidor también valida)
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar 5 MB.');
      return;
    }

    setError('');
    setSuccess(false);
    setUploading(true);

    let localPreview: string | null = null;

    try {
      // 1. Convertir a WebP en el navegador (ahorra ancho de banda)
      const webpBlob = await convertToWebP(file, 800);

      // 2. Preview inmediato con la versión local
      localPreview = URL.createObjectURL(webpBlob);
      setPreview(localPreview);

      // 3. Enviar al API route (servidor valida admin + guarda todo)
      const formData = new FormData();
      formData.append('file', webpBlob, 'chef-photo.webp');

      const res = await fetch('/api/chef-photo', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? `Error ${res.status}`);
      }

      // 4. Reemplazar preview local por URL pública final
      setPreview(json.url);
      if (localPreview) URL.revokeObjectURL(localPreview);

      // 5. Invalidar caché de Server Components para que /sobre-mi recargue
      router.refresh();

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error('[ChefPhotoUpload]', err);
      setError(err.message ?? 'Error al subir la foto.');
      // Revertir preview si falla
      setPreview(currentPhotoUrl);
      if (localPreview) URL.revokeObjectURL(localPreview);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const convertToWebP = (file: File, maxSize: number): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round((h * maxSize) / w); w = maxSize; }
          else        { w = Math.round((w * maxSize) / h); h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Sin contexto canvas')); return; }
        ctx.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          b => b ? resolve(b) : reject(new Error('Error al convertir')),
          'image/webp', 0.88
        );
      };
      img.onerror = () => reject(new Error('Error al leer imagen'));
      img.src = URL.createObjectURL(file);
    });

  return (
    <div className="relative group">
      {/* Foto actual o placeholder */}
      <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden bg-parchment border-4 border-white shadow-xl">
        {preview ? (
          <Image
            src={preview}
            alt="Foto del chef"
            fill
            className="object-cover"
            sizes="224px"
            unoptimized={preview.startsWith('blob:')}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <div className="w-16 h-16 rounded-full bg-paprika/10 flex items-center justify-center">
              <span className="text-3xl font-bold text-paprika font-display">C</span>
            </div>
            <p className="text-xs text-walnut/40 font-ui">Sin foto</p>
          </div>
        )}

        {/* Overlay al hover */}
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 bg-walnut/50 opacity-0 group-hover:opacity-100
                     transition-opacity duration-200 flex flex-col items-center justify-center
                     gap-2 cursor-pointer"
          aria-label="Cambiar foto del chef"
        >
          {uploading ? (
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          ) : (
            <>
              <Camera className="w-7 h-7 text-white" />
              <span className="text-xs text-white font-ui font-medium">Cambiar foto</span>
            </>
          )}
        </button>
      </div>

      {/* Input oculto */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />

      {/* Botón visible debajo (mobile friendly) */}
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg
                   bg-white border border-walnut/20 text-sm font-ui font-medium text-walnut/70
                   hover:border-paprika hover:text-paprika transition-all duration-200
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> Subiendo…</>
        ) : success ? (
          <><CheckCircle className="w-4 h-4 text-herb" /> <span className="text-herb">¡Foto actualizada!</span></>
        ) : (
          <><Camera className="w-4 h-4" /> {preview ? 'Cambiar foto' : 'Subir foto'}</>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-wine/5 rounded-lg border border-wine/20">
          <X className="w-4 h-4 text-wine flex-shrink-0 mt-0.5" />
          <p className="text-xs text-wine">{error}</p>
        </div>
      )}
    </div>
  );
}
