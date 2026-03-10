import { useEffect, useState } from 'react';
import logoJoviat from './logo_joviat.webp';
import { fetchAlumni } from './alumniApi';
import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('alumni');
  const [alumni, setAlumni] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSidebar = () => {
    setSidebarOpen((prevOpen) => !prevOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  useEffect(() => {
    if (activeSection !== 'alumni') {
      return;
    }

    const loadAlumni = async () => {
      setLoading(true);
      setError('');

      try {
        const result = await fetchAlumni();
        setAlumni(result);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadAlumni();
  }, [activeSection]);

  return (
    <div className={`app-layout ${sidebarOpen ? 'sidebar-visible' : ''}`}>
      <header className="top-header">
        <button
          type="button"
          className="menu-button"
          aria-label={sidebarOpen ? 'Ocultar barra lateral' : 'Mostrar barra lateral'}
          aria-expanded={sidebarOpen}
          onClick={toggleSidebar}
        >
          {sidebarOpen ? '✕' : '☰'}
        </button>

        <img src={logoJoviat} className="header-logo" alt="logo_joviat" />
      </header>

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <nav>
          <ul>
            <li>
              <button
                type="button"
                className={`nav-link ${activeSection === 'alumni' ? 'nav-link-active' : ''}`}
                onClick={() => setActiveSection('alumni')}
              >
                Visualitzar alumnes
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {sidebarOpen && <button className="overlay" onClick={closeSidebar} aria-label="Cerrar barra lateral" />}

      <main className="content">
        <h1>Visualitzar alumnes</h1>

        {loading && <p>Carregant alumnes...</p>}
        {error && <p className="error-message">{error}</p>}

        {!loading && !error && (
          <section className="alumni-grid" aria-label="Llista d'alumnes">
            {alumni.map((student) => (
              <article key={student.id} className="student-card">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt={student.name} className="student-photo" />
                ) : (
                  <div className="student-photo-placeholder">Sense foto</div>
                )}
                <h2>{student.name}</h2>
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
