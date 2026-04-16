// ============================================
// POST /api/chef-photo
// ============================================
// Sube la foto del chef (dato global del sitio).
// Solo admins pueden subirla. Se guarda en site_settings (fila única).
 
import { createSupabaseServer } from '@/lib/supabase-server';
import { NextRequest, NextResponse } from 'next/server';
 
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
 
    // 1. Verificar sesión
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autenticado. Vuelve a iniciar sesión.' },
        { status: 401 }
      );
    }
 
    // 2. Verificar que el usuario es admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();
 
    if (profileError || !profile?.is_admin) {
      return NextResponse.json(
        { error: 'No tienes permisos de administrador.' },
        { status: 403 }
      );
    }
 
    // 3. Leer el archivo del FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
 
    if (!file) {
      return NextResponse.json(
        { error: 'No se envió ningún archivo.' },
        { status: 400 }
      );
    }
 
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen.' },
        { status: 400 }
      );
    }
 
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'La imagen no puede superar 5 MB.' },
        { status: 400 }
      );
    }
 
    // 4. Subir a Storage (bucket site-assets)
    const path = `chef-photo-${Date.now()}.webp`;
    const arrayBuffer = await file.arrayBuffer();
 
    const { error: uploadError } = await supabase.storage
      .from('site-assets')
      .upload(path, arrayBuffer, {
        upsert: true,
        contentType: 'image/webp',
      });
 
    if (uploadError) {
      console.error('[chef-photo] Upload error:', uploadError);
      return NextResponse.json(
        { error: `Error al subir: ${uploadError.message}` },
        { status: 500 }
      );
    }
 
    // 5. URL pública
    const { data: urlData } = supabase.storage
      .from('site-assets')
      .getPublicUrl(path);
 
    const publicUrl = urlData.publicUrl;
 
    // 6. Actualizar site_settings (fila única id=1)
    const { data: updated, error: dbError } = await supabase
      .from('site_settings')
      .update({
        chef_photo_url: publicUrl,
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      })
      .eq('id', 1)
      .select('chef_photo_url');
 
    if (dbError) {
      console.error('[chef-photo] DB error:', dbError);
      return NextResponse.json(
        { error: `Error al guardar: ${dbError.message}` },
        { status: 500 }
      );
    }
 
    if (!updated || updated.length === 0) {
      console.error('[chef-photo] No rows updated — fila id=1 no existe o RLS bloqueó.');
      return NextResponse.json(
        { error: 'No se pudo guardar. Verifica que la tabla site_settings exista.' },
        { status: 500 }
      );
    }
 
    // 7. Éxito
    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (err: any) {
    console.error('[chef-photo] Unexpected error:', err);
    return NextResponse.json(
      { error: err.message ?? 'Error inesperado.' },
      { status: 500 }
    );
  }
}