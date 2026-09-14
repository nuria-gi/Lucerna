'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabaseClient';

function viajeroVacio() {
  return {
    nombre: '',
    apellidos: '',
    fecha_nacimiento: '',
    sexo: 'Mujer',
    nacionalidad: 'España',
    tipo_documento: 'DNI',
    numero_documento: '',
    anverso: null,
    reverso: null,
  };
}

export default function CheckinPage() {
  const { reservaId } = useParams();
  const router = useRouter();

  const [sesion, setSesion] = useState(undefined);
  const [reserva, setReserva] = useState(null);
  const [viajeros, setViajeros] = useState([]);
  const [yaRegistrados, setYaRegistrados] = useState(0);
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
        setError('No se ha encontrado esa reserva.');
        return;
      }

      setReserva(reservaData);

      const { count } = await supabase
        .from('viajeros_reserva')
        .select('id', { count: 'exact', head: true })
        .eq('reserva_id', reservaId);

      setYaRegistrados(count || 0);

      const pendientes = Math.max((reservaData.num_huespedes || 1) - (count || 0), 0);
      setViajeros(Array.from({ length: pendientes || 1 }, viajeroVacio));
    }

    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservaId, router]);

  function actualizarViajero(i, campo, valor) {
    setViajeros((prev) => {
      const copia = [...prev];
      copia[i] = { ...copia[i], [campo]: valor };
      return copia;
    });
  }

  async function subirFoto(file, sufijo, index) {
    if (!file) return null;
    const extension = file.name.split('.').pop();
    const ruta = `${reservaId}/${Date.now()}-${index}-${sufijo}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from('documentos-viajeros')
      .upload(ruta, file);

    if (uploadError) {
      throw new Error('No se ha podido subir la foto del documento.');
    }
    return ruta;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    try {
      for (let i = 0; i < viajeros.length; i++) {
        const v = viajeros[i];

        if (!v.nombre || !v.apellidos || !v.fecha_nacimiento || !v.numero_documento) {
          throw new Error(`Completa todos los datos obligatorios del viajero ${i + 1}.`);
        }

        const [rutaAnverso, rutaReverso] = await Promise.all([
          subirFoto(v.anverso, 'anverso', i),
          subirFoto(v.reverso, 'reverso', i),
        ]);

        const { error: rpcError } = await supabase.rpc('registrar_viajero', {
          p_reserva_id: reservaId,
          p_es_titular: yaRegistrados === 0 && i === 0,
          p_nombre: v.nombre,
          p_apellidos: v.apellidos,
          p_fecha_nacimiento: v.fecha_nacimiento,
          p_sexo: v.sexo,
          p_nacionalidad: v.nacionalidad,
          p_tipo_documento: v.tipo_documento,
          p_numero_documento: v.numero_documento,
          p_ruta_anverso: rutaAnverso,
          p_ruta_reverso: rutaReverso,
        });

        if (rpcError) {
          throw new Error('No se han podido guardar los datos de uno de los viajeros.');
        }
      }

      setOk(true);
    } catch (err) {
      setError(err.message || 'Ha ocurrido un error al guardar el check-in.');
    } finally {
      setEnviando(false);
    }
  }

  if (error && !reserva) {
    return (
      <main className="container">
        <p>{error}</p>
      </main>
    );
  }

  if (sesion === undefined || !reserva) {
    return (
      <main className="container">
        <p>Cargando…</p>
      </main>
    );
  }

  if (ok) {
    return (
      <main className="container login-container">
        <h1>Check-in completado</h1>
        <p>
          Hemos registrado los datos de tus acompañantes para cumplir con el registro de
          viajeros exigido por la normativa española.
        </p>
        <a href="/mis-reservas">Volver a mis reservas &rarr;</a>
      </main>
    );
  }

  return (
    <main className="container login-container">
      <h1>Check-in — {reserva.propiedades?.nombre}</h1>
      <p className="descripcion">
        {reserva.fecha_entrada} → {reserva.fecha_salida} · {reserva.num_huespedes}{' '}
        {reserva.num_huespedes === 1 ? 'huésped' : 'huéspedes'}
      </p>
      <p className="descripcion">
        Estos datos son obligatorios por el Real Decreto de registro de viajeros y se guardan
        cifrados. Necesitamos el documento de identidad de cada persona alojada.
      </p>

      <form onSubmit={handleSubmit}>
        {viajeros.map((v, i) => (
          <fieldset key={i} className="login-form" style={{ marginBottom: '1.5rem' }}>
            <legend>
              <strong>
                Viajero {yaRegistrados + i + 1} de {reserva.num_huespedes}
              </strong>
            </legend>

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
              <option value="Mujer">Mujer</option>
              <option value="Hombre">Hombre</option>
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
              <option value="Pasaporte">Pasaporte</option>
            </select>

            <label>Número de documento</label>
            <input
              type="text"
              value={v.numero_documento}
              onChange={(e) => actualizarViajero(i, 'numero_documento', e.target.value)}
              required
            />

            <label>Foto del documento (anverso)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => actualizarViajero(i, 'anverso', e.target.files[0])}
            />

            <label>Foto del documento (reverso)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => actualizarViajero(i, 'reverso', e.target.files[0])}
            />
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
