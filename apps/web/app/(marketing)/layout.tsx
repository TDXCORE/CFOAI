function SiteLayout(props: React.PropsWithChildren) {
  // Ultra-simplified layout to isolate 404 issue
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '1rem', borderBottom: '1px solid #ddd' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>CFO AI</h1>
          <nav>
            <a href="/auth/sign-in" style={{ marginRight: '1rem', textDecoration: 'none' }}>Iniciar Sesión</a>
            <a href="/auth/sign-up" style={{ textDecoration: 'none' }}>Registrarse</a>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {props.children}
      </main>

      <footer style={{ padding: '2rem', borderTop: '1px solid #ddd', textAlign: 'center' }}>
        <p>© 2025 CFO AI. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export default SiteLayout;
