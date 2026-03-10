import { useEffect, useState } from 'react';
import logoJoviat from './logo_joviat.webp';
import { fetchAlumni, fetchRestaurants } from './alumniApi';
import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('alumni');
  const [alumni, setAlumni] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSidebar = () => {
    setSidebarOpen((prevOpen) => !prevOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  useEffect(() => {
    const loadSectionData = async () => {
      setLoading(true);
      setError('');

      try {
        if (activeSection === 'alumni') {
          const result = await fetchAlumni();
          setAlumni(result);
          return;
        }

        const result = await fetchRestaurants();
        setRestaurants(result);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadSectionData();
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
            <li>
              <button
                type="button"
                className={`nav-link ${activeSection === 'restaurants' ? 'nav-link-active' : ''}`}
                onClick={() => setActiveSection('restaurants')}
              >
                Veure restaurants al mapa
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {sidebarOpen && <button className="overlay" onClick={closeSidebar} aria-label="Cerrar barra lateral" />}

      <main className="content">
        <h1>{activeSection === 'alumni' ? 'Visualitzar alumnes' : 'Restaurants al mapa'}</h1>

        {loading && <p>Carregant dades...</p>}
        {error && <p className="error-message">{error}</p>}

        {!loading && !error && activeSection === 'alumni' && (
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

        {!loading && !error && activeSection === 'restaurants' && (
          <section className="restaurant-grid" aria-label="Llista de restaurants al mapa">
            {restaurants.map((restaurant) => (
              <article key={restaurant.id} className="restaurant-card">
                <h2>{restaurant.name}</h2>
                {restaurant.location ? (
                  <iframe
                    title={`Mapa de ${restaurant.name}`}
                    className="restaurant-map"
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${restaurant.location.lng - 0.01}%2C${restaurant.location.lat - 0.01}%2C${restaurant.location.lng + 0.01}%2C${restaurant.location.lat + 0.01}&layer=mapnik&marker=${restaurant.location.lat}%2C${restaurant.location.lng}`}
                  />
                ) : (
                  <p>No hi ha coordenades disponibles.</p>
                )}
              </article>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
