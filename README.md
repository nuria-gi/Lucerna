# La Lucera de Peñafiel

App de gestión para la casa rural "La Lucera de Peñafiel".

## Stack
- [Next.js](https://nextjs.org/) (App Router)
- [Supabase](https://supabase.com/) (base de datos y autenticación)
- [Vercel](https://vercel.com/) (despliegue)

## Módulos previstos
- Usuarios (Huéspedes y Admin)
- Reservas
- Habitaciones / Propiedades
- Reseñas

## Desarrollo local

```bash
npm install
cp .env.local.example .env.local
# Rellena las variables de Supabase en .env.local
npm run dev
```

## Despliegue

Este proyecto está conectado a Vercel: cada push a `main` despliega automáticamente a producción.
Variables de entorno necesarias en Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
