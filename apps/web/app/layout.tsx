import '../styles/globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Ultra-simplified root layout to isolate the 404 issue
  // Removed all complex dependencies that could fail at runtime
  
  return (
    <html lang="es" className="bg-background min-h-screen antialiased">
      <head>
        <title>CFO AI - Plataforma de Gestión Fiscal Colombiana</title>
        <meta name="description" content="Automatiza el procesamiento de facturas y gestión de impuestos colombianos con inteligencia artificial" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
