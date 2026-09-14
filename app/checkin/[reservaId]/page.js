'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

function viajeroVacio(esTitular) {
  return {
    es_titular: esTitular,
    nombre: '',
    apellidos: '',
    fecha_nacimiento: '',
    sexo: 'H',
    nacionalidad: 'Española',
    tipo_documento: 'DNI',
    numero_documento: '',
  };
}

export default function CheckinPage() {
  const { reservaId } = useParams();
  const router = useRouter();

  const [sesion, setSesion] = useState(undefined);
  const [reserva, setReserva] = useState(null);
  const [viajerosExistentes, setViajerosExistentes] = useState(null);
  const [viajeros, setViajeros] = useState([]);
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

      const { data: reservaData, error: reservaError } = await supabase
        .from('reservas')
        .select('*, propiedades(nombre)')
        .eq('id', reservaId)
        .single();

      if (reservaError || !reservaData) {
        setError('No se ha encontrado la reserva.');
        return;
      }

      setReserva(reservaData);

      const { data: viajerosData } = await supabase
        .from('viajeros_reserva')
        .select('id, nombre, apellidos, es_titular')
        .eq('reserva_id', reservaId);

      setViajerosExistentes(viajerosData || []);

      if (!viajerosData || viajerosData.length === 0) {
        const n = reservaData.num_huespedes || 1;
        setViajeros(Array.from({ length: n }, (_, i) => viajeroVacio(i === 0)));
      }
    }

    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservaId, router]);

  function actualizarViajero(index, campo, valor) {
    setViajeros((prev) =>
      prev.map((v, i) => (i === index ? { ...v, [campo]: valor } : v))
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    for (const v of viajeros) {
      if (!v.nombre || !v.apellidos || !v.fecha_nacimiento || !v.nacionalidad || !v.numero_documento) {
        setError('Completa todos los campos de todos los viajeros.');
        return;
      }
    }

    setEnviando(true);

    for (const v of viajeros) {
      const { error: rpcError } = await supabase.rpc('registrar_viajero', {
        p_reserva_id: reservaId,
        p_es_titular: v.es_titular,
        p_nombre: v.nombre,
        p_apellidos: v.apellidos,
        p_fecha_nacimiento: v.fecha_nacimiento,
        p_sexo: v.sexo,
        p_nacionalidad: v.nacionalidad,
        p_tipo_documento: v.tipo_documento,
        p_numero_documento: v.numero_documento,
      });

      if (rpcError) {
        setError('No se ha podido registrar a uno de los viajeros. Inténtalo de nuevo.');
        setEnviando(false);
        return;
      }
    }

    setEnviando(false);
    setOk(true);
  }

  if (error && !reserva) {
    return (
      <main className="container">
        <p>{error}</p>
      </main>
    );
  }

  if (!reserva || viajerosExistentes === null) {
    return (
      <main className="container">
        <p>Cargando…</p>
      </main>
    );
  }

  if (ok || viajerosExistentes.length > 0) {
    const lista = ok ? viajeros : viajerosExistentes;
    return (
      <main className="container">
        <h1>Check-in completado</h1>
        <p>
          Reserva en <strong>{reserva.propiedades?.nombre}</strong> ({reserva.fecha_entrada} &rarr;{' '}
          {reserva.fecha_salida})
        </p>
        <ul>
          {lista.map((v, i) => (
            <li key={v.id || i}>
              {v.nombre} {v.apellidos} {v.es_titular ? '(titular)' : ''}
            </li>
          ))}
        </ul>
        <p>Los datos se han guardado de forma cifrada, listos para la comunicación a las Fuerzas y Cuerpos de Seguridad (SES.Hospedajes).</p>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Check-in</h1>
      <p className="descripcion">
        Reserva en <strong>{reserva.propiedades?.nombre}</strong> ({reserva.fecha_entrada} &rarr;{' '}
        {reserva.fecha_salida}). Introduce los datos de cada huésped, tal y como exige el registro
        de viajeros (SES.Hospedajes).
      </p>

      <form onSubmit={handleSubmit}>
        {viajeros.map((v, i) => (
          <fieldset key={i} className="viajero-fieldset">
            <legend>Huésped {i + 1} {v.es_titular ? '(titular de la reserva)' : ''}</legend>

            <div className="login-form">
              <label>Nombre</label>
              <input
                type="text"
                value={v.nombre}
                onChange={(e) => actualizarViajero(i, 'nombre', e.target.value)}
                required
              />

              <label>Apellidos</label>
              <input
                type="text"
                value={v.apellidos}
                onChange={(e) => actualizarViajero(i, 'apellidos', e.target.value)}
                required
              />

              <label>Fecha de nacimiento</label>
              <input
                type="date"
                value={v.fecha_nacimiento}
                onChange={(e) => actualizarViajero(i, 'fecha_nacimiento', e.target.value)}
                required
              />

              <label>Sexo</label>
              <select value={v.sexo} onChange={(e) => actualizarViajero(i, 'sexo', e.target.value)}>
                <option value="H">Hombre</option>
                <option value="M">Mujer</option>
              </select>

              <label>Nacionalidad</label>
              <input
                type="text"
                value={v.nacionalidad}
                onChange={(e) => actualizarViajero(i, 'nacionalidad', e.target.value)}
                required
              />

              <label>Tipo de documento</label>
              <select
                value={v.tipo_documento}
                onChange={(e) => actualizarViajero(i, 'tipo_documento', e.target.value)}
              >
                <option value="DNI">DNI</option>
                <option value="NIE">NIE</option>
                <option value="PASAPORTE">Pasaporte</option>
              </select>

              <label>Número de documento</label>
              <input
                type="text"
                value={v.numero_documento}
                onChange={(e) => actualizarViajero(i, 'numero_documento', e.target.value)}
                required
              />
            </div>
          </fieldset>
        ))}

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Guardando…' : 'Completar check-in'}
        </button>
      </form>
    </main>
  );
}
