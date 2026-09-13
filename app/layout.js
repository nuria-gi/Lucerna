import './globals.css';

export const metadata = {
  title: 'La Lucera de Peñafiel',
  description: 'Gestión de la casa rural La Lucera de Peñafiel',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
