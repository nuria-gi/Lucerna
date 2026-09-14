'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

const ESTADO_LABEL = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  completada: 'Completada',
};

export default function MisReservasPage() {
  const router = useRouter();
  const [reservas, setReservas] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargar() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace('/login');
      return;
    }

    const { data, error } = await supabase
      .from('reservas')
      .select('*, propiedades(nombre)')
      .eq('huesped_id', session.user.id)
      .order('fecha_entrada', { ascending: false });

    if (error) {
      setError('No se han podido cargar tus reservas.');
      return;
    }

    setReservas(data);
  }

  async function cancelar(id) {
    const { error } = await supabase
      .from('reservas')
      .update({ estado: 'cancelada' })
      .eq('id', id);

    if (!error) {
      cargar();
    }
  }

  if (error) {
    return (
      <main className="container">
        <p>{error}</p>
      </main>
    );
  }

  if (!reservas) {
    return (
      <main className="container">
        <p>Cargando…</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Mis reservas</h1>

      {reservas.length === 0 && (
        <p>
          Aún no tienes reservas. <a href="/reservar">Haz una ahora &rarr;</a>
        </p>
      )}

      <div className="grid">
        {reservas.map((r) => (
          <article key={r.id} className="card">
            <div className="card-body">
              <h2>{r.propiedades?.nombre}</h2>
              <p className="descripcion">
                {r.fecha_entrada} &rarr; {r.fecha_salida} &middot; {r.num_huespedes}{' '}
                {r.num_huespedes === 1 ? 'huésped' : 'huéspedes'}
              </p>
              <p className="precio">{r.precio_total} €</p>
              <p>
                <span className="tag">{ESTADO_LABEL[r.estado] || r.estado}</span>
              </p>
              {(r.estado === 'pendiente' || r.estado === 'confirmada') && (
                <>
                  <p>
                    <a href={`/checkin/${r.id}`}>Hacer check-in &rarr;</a>
                  </p>
                  <button onClick={() => cancelar(r.id)}>Cancelar reserva</button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
