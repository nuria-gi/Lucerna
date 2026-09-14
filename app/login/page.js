'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setEnviando(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        data: nombre ? { nombre_completo: nombre } : undefined,
        emailRedirectTo:
          typeof window !== 'undefined' ? `${window.location.origin}/cuenta` : undefined,
      },
    });

    setEnviando(false);

    if (error) {
      setError('No se ha podido enviar el enlace. Inténtalo de nuevo.');
      return;
    }

    setEnviado(true);
  }

  if (enviado) {
    return (
      <main className="container login-container">
        <h1>Revisa tu correo</h1>
        <p>
          Te hemos enviado un enlace de acceso a <strong>{email}</strong>. Ábrelo desde este
          mismo dispositivo para entrar.
        </p>
      </main>
    );
  }

  return (
    <main className="container login-container">
      <h1>Acceder / Registrarse</h1>
      <p className="descripcion">
        Escribe tu email y te enviamos un enlace mágico para entrar. Si es tu primera vez, se
        creará tu cuenta automáticamente.
      </p>

      <form onSubmit={handleSubmit} className="login-form">
        <label htmlFor="nombre">Nombre (solo si es tu primera vez)</label>
        <input
          id="nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu nombre completo"
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@ejemplo.com"
        />

        {error && <p className="error">{error}</p>}

        <button type="submit" disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviarme el enlace'}
        </button>
      </form>
    </main>
  );
}
