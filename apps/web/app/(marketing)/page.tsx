function Home() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1 style={{ fontSize: '3rem', color: '#333', marginBottom: '1rem' }}>
        CFO AI Platform
      </h1>
      <h2 style={{ fontSize: '2rem', color: '#666', marginBottom: '2rem' }}>
        para Empresas Colombianas
      </h2>
      
      <p style={{ fontSize: '1.2rem', lineHeight: '1.6', marginBottom: '2rem', maxWidth: '600px' }}>
        Automatiza el procesamiento de facturas y gestión de impuestos colombianos 
        con inteligencia artificial. Simplifica tu contabilidad empresarial.
      </p>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
        <a 
          href="/auth/sign-up" 
          style={{
            backgroundColor: '#0070f3',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          Comenzar
        </a>
        <a 
          href="/auth/sign-in"
          style={{
            color: '#0070f3',
            padding: '0.75rem 1.5rem',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}
        >
          Iniciar Sesión
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Procesamiento Automático</h3>
          <p>Procesa facturas automáticamente desde Outlook con OCR e IA.</p>
        </div>
        
        <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Cálculos Fiscales</h3>
          <p>IVA, ReteFuente, ReteIVA y ICA calculados automáticamente.</p>
        </div>
        
        <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Integración Contable</h3>
          <p>Conecta con Siigo, World Office y SAP.</p>
        </div>
        
        <div style={{ padding: '1.5rem', border: '1px solid #ddd', borderRadius: '0.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Cumplimiento DIAN</h3>
          <p>Genera reportes UBL para cumplir con regulaciones colombianas.</p>
        </div>
      </div>
    </div>
  );
}

export default Home;
