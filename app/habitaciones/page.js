import { supabase } from '../../lib/supabaseClient';

export const revalidate = 60;

export default async function HabitacionesPage() {
  const [{ data: habitaciones, error }, { data: tarifas }] = await Promise.all([
    supabase.from('propiedades').select('*').eq('activa', true).order('nombre'),
    supabase.from('tarifas_casa').select('*'),
  ]);

  if (error) {
    return (
      <main className="container">
        <h1>Habitaciones</h1>
        <p>No se han podido cargar las habitaciones. Inténtalo más tarde.</p>
      </main>
    );
  }

  const tarifaFinde = tarifas?.find((t) => t.tipo === 'fin_de_semana')?.precio_noche;
  const tarifaEntreSemana = tarifas?.find((t) => t.tipo === 'entre_semana')?.precio_noche;

  return (
    <main className="container">
      <h1>Nuestras habitaciones</h1>

      {(tarifaFinde || tarifaEntreSemana) && (
        <p className="tarifas">
          {tarifaEntreSemana && <>De domingo a jueves: <strong>{tarifaEntreSemana} € / noche</strong></>}
          {tarifaEntreSemana && tarifaFinde && ' · '}
          {tarifaFinde && <>Viernes y sábado: <strong>{tarifaFinde} € / noche</strong></>}
        </p>
      )}

      {habitaciones.length === 0 && (
        <p>No hay habitaciones disponibles ahora mismo.</p>
      )}

      <div className="grid">
        {habitaciones.map((h) => (
          <article key={h.id} className="card">
            {h.imagenes && h.imagenes[0] && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={h.imagenes[0]} alt={h.nombre} className="card-image" />
            )}
            <div className="card-body">
              <h2>{h.nombre}</h2>
              {h.descripcion && <p className="descripcion">{h.descripcion}</p>}

              <ul className="detalles">
                <li>Hasta {h.capacidad_maxima} personas</li>
                {h.num_camas && (
                  <li>{h.num_camas} {h.num_camas === 1 ? 'cama' : 'camas'}</li>
                )}
                {h.num_banos && (
                  <li>{h.num_banos} {h.num_banos === 1 ? 'baño' : 'baños'}</li>
                )}
                {h.metros_cuadrados && <li>{h.metros_cuadrados} m²</li>}
              </ul>

              {h.comodidades && h.comodidades.length > 0 && (
                <div className="comodidades">
                  {h.comodidades.map((c) => (
                    <span key={c} className="tag">{c}</span>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
