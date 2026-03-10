import { useEffect, useRef, useState } from 'react';
import logoJoviat from './logo_joviat.webp';
import { fetchAlumni, fetchRestaurants } from './alumniApi';
import './App.css';

let leafletLoader;

function configureLeafletIcons(L) {
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

function loadLeaflet() {
  if (process.env.NODE_ENV === 'test') {
    return Promise.resolve(null);
  }

  if (window.L) {
    configureLeafletIcons(window.L);
    return Promise.resolve(window.L);
  }

  if (!leafletLoader) {
    leafletLoader = new Promise((resolve, reject) => {
      const cssId = 'leaflet-css';
      if (!document.getElementById(cssId)) {
        const link = document.createElement('link');
        link.id = cssId;
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }

      const scriptId = 'leaflet-js';
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        if (window.L) {
          configureLeafletIcons(window.L);
          resolve(window.L);
          return;
        }

        existingScript.addEventListener('load', () => {
          configureLeafletIcons(window.L);
          resolve(window.L);
        });
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        configureLeafletIcons(window.L);
        resolve(window.L);
      };
      script.onerror = () => reject(new Error('No s’ha pogut carregar el mapa.'));
      document.body.appendChild(script);
    });
  }

  return leafletLoader;
}

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('alumni');
  const [alumni, setAlumni] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapError, setMapError] = useState('');
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const goHome = () => {
    setActiveSection('alumni');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  useEffect(() => {
    if (activeSection !== 'restaurants') {
      return;
    }

    const validRestaurants = restaurants.filter((restaurant) => restaurant.location);
    if (!validRestaurants.length || !mapContainerRef.current) {
      return;
    }

    let cancelled = false;

    const renderMap = async () => {
      try {
        const L = await loadLeaflet();
        if (!L || cancelled || !mapContainerRef.current) {
          return;
        }

        if (!mapInstanceRef.current) {
          const first = validRestaurants[0].location;
          mapInstanceRef.current = L.map(mapContainerRef.current).setView([first.lat, first.lng], 11);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
          }).addTo(mapInstanceRef.current);
        }

        if (markersLayerRef.current) {
          markersLayerRef.current.remove();
        }

        markersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current);

        const bounds = [];
        validRestaurants.forEach((restaurant) => {
          const { lat, lng } = restaurant.location;
          L.circleMarker([lat, lng], {
            radius: 8,
            fillColor: '#22c55e',
            color: '#14532d',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.95,
          }).bindPopup(restaurant.name).addTo(markersLayerRef.current);
          bounds.push([lat, lng]);
        });

        if (bounds.length > 1) {
          mapInstanceRef.current.fitBounds(bounds, { padding: [30, 30] });
        } else if (bounds.length === 1) {
          mapInstanceRef.current.setView(bounds[0], 12);
        }

        setMapError('');
      } catch (renderError) {
        setMapError(renderError.message);
      }
    };

    renderMap();

    return () => {
      cancelled = true;
    };
  }, [activeSection, restaurants]);

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

        <button type="button" className="logo-button" onClick={goHome} aria-label="Anar a la pàgina inicial">
          <img src={logoJoviat} className="header-logo" alt="logo_joviat" />
        </button>
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
          <>
            <section className="restaurants-overview-map" aria-label="Mapa amb pins de restaurants">
              <h2>Mapa general de restaurants</h2>
              {mapError && <p className="error-message">{mapError}</p>}
              <div ref={mapContainerRef} className="restaurants-map-canvas" />
            </section>

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
          </>
        )}
      </main>
    </div>
  );
}

export default App;
