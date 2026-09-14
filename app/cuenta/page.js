'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function CuentaPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }

      const { data } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setPerfil({ ...data, email: session.user.email });
      setCargando(false);
    }

    cargar();
  }, [router]);

  async function cerrarSesion() {
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (cargando) {
    return (
      <main className="container">
        <p>Cargando…</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Mi cuenta</h1>
      <p>
        <strong>Nombre:</strong> {perfil.nombre_completo}
      </p>
      <p>
        <strong>Email:</strong> {perfil.email}
      </p>
      <p>
        <strong>Rol:</strong> {perfil.rol}
      </p>
      <button onClick={cerrarSesion}>Cerrar sesión</button>
    </main>
  );
}
