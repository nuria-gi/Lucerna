'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

function calcularPrecio(fechaEntrada, fechaSalida, tarifaFinde, tarifaEntreSemana) {
  if (!fechaEntrada || !fechaSalida) return { noches: 0, total: 0 };

  const inicio = new Date(fechaEntrada + 'T00:00:00');
  const fin = new Date(fechaSalida + 'T00:00:00');
  let total = 0;
  let noches = 0;

  for (let d = new Date(inicio); d < fin; d.setDate(d.getDate() + 1)) {
    const diaSemana = d.getDay(); // 0 domingo ... 5 viernes, 6 sabado
    const esFinde = diaSemana === 5 || diaSemana === 6;
    total += esFinde ? Number(tarifaFinde) : Number(tarifaEntreSemana);
    noches += 1;
  }

  return { noches, total };
}

export default function ReservarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [sesion, setSesion] = useState(undefined);
  const [habitaciones, setHabitaciones] = useState([]);
  const [tarifas, setTarifas] = useState({ finde: 0, entreSemana: 0 });
  const [propiedadId, setPropiedadId] = useState(searchParams.get('habitacion') || '');
  const [fechaEntrada, setFechaEntrada] = useState('');
  const [fechaSalida, setFechaSalida] = useState('');
  const [numHuespedes, setNumHuespedes] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    async function cargar() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/login');
        return;
      }
      setSesion(session);

      const [{ data: props }, { data: tarifasData }] = await Promise.all([
        supabase.from('propiedades').select('*').eq('activa', true).order('nombre'),
        supabase.from('tarifas_casa').select('*'),
      ]);

      setHabitaciones(props || []);
      setTarifas({
        finde: tarifasData?.find((t) => t.tipo === 'fin_de_semana')?.precio_noche || 0,
        entreSemana: tarifasData?.find((t) => t.tipo === 'entre_semana')?.precio_noche || 0,
      });

      if (!propiedadId && props && props.length > 0) {
        setPropiedadId(props[0].id);
      }
    }

    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const habitacionSeleccionada = habitaciones.find((h) => h.id === propiedadId);

  const { noches, total } = useMemo(
    () => calcularPrecio(fechaEntrada, fechaSalida, tarifas.finde, tarifas.entreSemana),
    [fechaEntrada, fechaSalida, tarifas]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!propiedadId || !fechaEntrada || !fechaSalida) {
      setError('Completa habitación y fechas.');
      return;
    }

    if (noches <= 0) {
      setError('La fecha de salida debe ser posterior a la de entrada.');
      return;
    }

    if (habitacionSeleccionada && numHuespedes > habitacionSeleccionada.capacidad_maxima) {
      setError(`Esta habitación admite un máximo de ${habitacionSeleccionada.capacidad_maxima} personas.`);
      return;
    }

    setEnviando(true);

    const { error: insertError } = await supabase.from('reservas').insert({
      propiedad_id: propiedadId,
      huesped_id: sesion.user.id,
      fecha_entrada: fechaEntrada,
      fecha_salida: fechaSalida,
      num_huespedes: numHuespedes,
      precio_total: total,
      estado: 'pendiente',
    });

    setEnviando(false);

    if (insertError) {
      if (insertError.code === '23P01') {
        setError('Esa habitación ya está reservada en esas fechas. Prueba otras fechas.');
      } else {
        setError('No se ha podido crear la reserva. Inténtalo de nuevo.');
      }
      return;
    }

    setOk(true);
  }

  if (sesion === undefined) {
    return (
      <main className="container">
        <p>Cargando…</p>
      </main>
    );
  }

  if (ok) {
    return (
      <main className="container login-container">
        <h1>¡Reserva creada!</h1>
        <p>Tu reserva está pendiente de confirmación. Puedes verla en “Mis reservas”.</p>
        <a href="/mis-reservas">Ir a mis reservas &rarr;</a>
      </main>
    );
  }

  return (
    <main className="container login-container">
      <h1>Reservar habitación</h1>

      <form onSubmit={handleSubmit} className="login-form">
        <label htmlFor="habitacion">Habitación</label>
        <select
          id="habitacion"
          value={propiedadId}
          onChange={(e) => setPropiedadId(e.target.value)}
        >
          {habitaciones.map((h) => (
            <option key={h.id} value={h.id}>
              {h.nombre} (hasta {h.capacidad_maxima} personas)
            </option>
          ))}
        </select>

        <label htmlFor="entrada">Fecha de entrada</label>
        <input
          id="entrada"
          type="date"
          value={fechaEntrada}
          onChange={(e) => setFechaEntrada(e.target.value)}
          required
        />

        <label htmlFor="salida">Fecha de salida</label>
        <input
          id="salida"
          type="date"
          value={fechaSalida}
          onChange={(e) => setFechaSalida(e.target.value)}
          required
        />

        <label htmlFor="huespedes">Número de huéspedes</label>
        <input
          id="huespedes"
          type="number"
          min={1}
          value={numHuespedes}
          onChange={(e) => setNumHuespedes(Number(e.target.value))}
        />

        {noches > 0 && (
          <p className="tarifas" style={{ marginTop: '1rem' }}>
            {noches} {noches === 1 ? 'noche' : 'noches'} &middot; Total estimado:{' '}
            <strong>{total} €</strong>
          </p>
        )}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Reservando…' : 'Confirmar reserva'}
        </button>
      </form>
    </main>
  );
}
