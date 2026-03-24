import { useEffect, useRef, useState } from 'react';
import logoJoviat from './logo_joviat.webp';
import defaultAlumniPhoto from './default_alumni.svg';
import defaultRestaurantPhoto from './default_restaurant.svg';
import { addAlumni, addRestaurant, fetchAlumni, fetchRestaurants, isAdministrator } from './alumniApi';
import './App.css';

let leafletLoader;
const AUTH_STORAGE_KEY = 'hosteleriaapp-auth';
const ADMIN_STORAGE_KEY = 'hosteleriaapp-admin';
const LOGIN_EMAIL_KEY = 'hosteleriaapp-email';

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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAdmin, setIsAdmin] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return window.localStorage.getItem(ADMIN_STORAGE_KEY) === 'true';
  });
  const [loginLoading, setLoginLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState('alumni');
  const [alumni, setAlumni] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedAlumni, setSelectedAlumni] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mapError, setMapError] = useState('');
  const [alumniSearch, setAlumniSearch] = useState('');
  const [restaurantSearch, setRestaurantSearch] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [alumniForm, setAlumniForm] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    photoUrl: '',
  });
  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    email: '',
    phone: '',
    photoUrl: '',
    lat: '',
    lng: '',
  });
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);

  const normalizedAlumniSearch = alumniSearch.trim().toLowerCase();
  const normalizedRestaurantSearch = restaurantSearch.trim().toLowerCase();
  const filteredAlumni = alumni.filter((student) =>
    student.name.toLowerCase().includes(normalizedAlumniSearch)
  );
  const filteredRestaurants = restaurants.filter((restaurant) =>
    restaurant.name.toLowerCase().includes(normalizedRestaurantSearch)
  );
  const isAlumniSection = activeSection === 'alumni' || activeSection === 'alumni-detail';
  const isRestaurantSection = activeSection === 'restaurants' || activeSection === 'restaurant-detail';

  const goHome = () => {
    setActiveSection('alumni');
    setSelectedAlumni(null);
    setSelectedRestaurant(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Introdueix email i contrasenya.');
      return;
    }

    setLoginLoading(true);

    try {
      const admin = await isAdministrator(loginEmail);
      setLoginError('');
      setIsAuthenticated(true);
      setIsAdmin(admin);
      window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      window.localStorage.setItem(ADMIN_STORAGE_KEY, admin ? 'true' : 'false');
      window.localStorage.setItem(LOGIN_EMAIL_KEY, loginEmail.trim());
    } catch (authError) {
      setLoginError(authError.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
    window.localStorage.removeItem(LOGIN_EMAIL_KEY);
    setLoginPassword('');
    setActiveSection('alumni');
    setSelectedAlumni(null);
    setSelectedRestaurant(null);
  };

  const handleAddAlumni = async (event) => {
    event.preventDefault();
    setAdminMessage('');

    try {
      await addAlumni(alumniForm);
      const result = await fetchAlumni();
      setAlumni(result);
      setAlumniForm({ name: '', email: '', phone: '', linkedin: '', photoUrl: '' });
      setAdminMessage('Alumne afegit correctament.');
    } catch (saveError) {
      setAdminMessage(saveError.message);
    }
  };

  const handleAddRestaurant = async (event) => {
    event.preventDefault();
    setAdminMessage('');

    try {
      await addRestaurant(restaurantForm);
      const result = await fetchRestaurants();
      setRestaurants(result);
      setRestaurantForm({ name: '', email: '', phone: '', photoUrl: '', lat: '', lng: '' });
      setAdminMessage('Restaurant afegit correctament.');
    } catch (saveError) {
      setAdminMessage(saveError.message);
    }
  };

  const toggleSidebar = () => {
    setSidebarOpen((prevOpen) => !prevOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const openAlumniList = () => {
    setSelectedAlumni(null);
    setActiveSection('alumni');
  };

  const openRestaurantsList = () => {
    setSelectedRestaurant(null);
    setActiveSection('restaurants');
  };

  const openAlumniDetail = (student) => {
    setSelectedAlumni(student);
    setActiveSection('alumni-detail');
  };

  const openRestaurantDetail = (restaurant) => {
    setSelectedRestaurant(restaurant);
    setActiveSection('restaurant-detail');
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const loadSectionData = async () => {
      setLoading(true);
      setError('');

      try {
        if (isAlumniSection) {
          const result = await fetchAlumni();
          setAlumni(result);
          return;
        }

        if (isRestaurantSection) {
          const result = await fetchRestaurants();
          setRestaurants(result);
        }
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setLoading(false);
      }
    };

    loadSectionData();
  }, [isAuthenticated, isAlumniSection, isRestaurantSection]);

  useEffect(() => {
    if (activeSection !== 'restaurants') {
      return;
    }

    const validRestaurants = filteredRestaurants.filter((restaurant) => restaurant.location);
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
  }, [activeSection, filteredRestaurants]);

  return (
    <div className={`app-layout ${sidebarOpen ? 'sidebar-visible' : ''}`}>
      {!isAuthenticated ? (
        <main className="login-screen">
          <section className="login-card" aria-label="Pantalla de login">
            <img src={logoJoviat} className="header-logo" alt="logo_joviat" />
            <h1>Login</h1>
            <form onSubmit={handleLogin} className="login-form">
              <label htmlFor="login-email">Email</label>
              <input
                id="login-email"
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="exemple@email.com"
              />
              <label htmlFor="login-password">Contrasenya</label>
              <input
                id="login-password"
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                placeholder="********"
              />
              {loginError && <p className="error-message">{loginError}</p>}
              <button type="submit" disabled={loginLoading}>
                {loginLoading ? 'Comprovant...' : 'Entrar'}
              </button>
            </form>
          </section>
        </main>
      ) : (
        <>
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
        <button type="button" className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <nav>
          <ul>
            <li>
              <button
                type="button"
                className={`nav-link ${isAlumniSection ? 'nav-link-active' : ''}`}
                onClick={openAlumniList}
              >
                Visualitzar alumnes
              </button>
            </li>
            <li>
              <button
                type="button"
                className={`nav-link ${isRestaurantSection ? 'nav-link-active' : ''}`}
                onClick={openRestaurantsList}
              >
                Veure restaurants al mapa
              </button>
            </li>
          </ul>
        </nav>
      </aside>

      {sidebarOpen && <button className="overlay" onClick={closeSidebar} aria-label="Cerrar barra lateral" />}

      <main className="content">
        <h1>
          {activeSection === 'alumni' && 'Visualitzar alumnes'}
          {activeSection === 'alumni-detail' && `Fitxa alumne: ${selectedAlumni?.name ?? ''}`}
          {activeSection === 'restaurants' && 'Restaurants al mapa'}
          {activeSection === 'restaurant-detail' && `Fitxa restaurant: ${selectedRestaurant?.name ?? ''}`}
        </h1>

        {loading && <p>Carregant dades...</p>}
        {error && <p className="error-message">{error}</p>}

        {!loading && !error && activeSection === 'alumni' && (
          <>
            {isAdmin && (
              <section className="admin-panel" aria-label="Accions admin alumnes">
                <h2>Accions administrador</h2>
                <form className="admin-form" onSubmit={handleAddAlumni}>
                  <input
                    placeholder="Nom alumne"
                    value={alumniForm.name}
                    onChange={(event) => setAlumniForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                  <input
                    placeholder="Email"
                    value={alumniForm.email}
                    onChange={(event) => setAlumniForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                  <input
                    placeholder="Phone"
                    value={alumniForm.phone}
                    onChange={(event) => setAlumniForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                  <input
                    placeholder="LinkedIn"
                    value={alumniForm.linkedin}
                    onChange={(event) => setAlumniForm((prev) => ({ ...prev, linkedin: event.target.value }))}
                  />
                  <input
                    placeholder="Photo URL"
                    value={alumniForm.photoUrl}
                    onChange={(event) => setAlumniForm((prev) => ({ ...prev, photoUrl: event.target.value }))}
                  />
                  <button type="submit">Afegir alumne</button>
                </form>
              </section>
            )}
            <label className="search-label" htmlFor="alumni-search">Buscar alumne per nom</label>
            <input
              id="alumni-search"
              type="search"
              className="search-input"
              placeholder="Ex: Marta"
              value={alumniSearch}
              onChange={(event) => setAlumniSearch(event.target.value)}
            />

            <section className="alumni-grid" aria-label="Llista d'alumnes">
              {filteredAlumni.map((student) => (
                <button key={student.id} type="button" className="card-button" onClick={() => openAlumniDetail(student)}>
                  <article className="student-card">
                    {student.photoUrl ? (
                      <img src={student.photoUrl} alt={student.name} className="student-photo" />
                    ) : (
                      <img src={defaultAlumniPhoto} alt={`Foto predeterminada de ${student.name}`} className="student-photo" />
                    )}
                    <h2>{student.name}</h2>
                  </article>
                </button>
              ))}
            </section>
          </>
        )}

        {!loading && !error && activeSection === 'alumni-detail' && selectedAlumni && (
          <article className="detail-card" aria-label={`Fitxa de ${selectedAlumni.name}`}>
            <button type="button" className="back-button" onClick={openAlumniList}>← Tornar al llistat</button>
            {selectedAlumni.photoUrl ? (
              <img src={selectedAlumni.photoUrl} alt={selectedAlumni.name} className="student-photo" />
            ) : (
              <img src={defaultAlumniPhoto} alt={`Foto predeterminada de ${selectedAlumni.name}`} className="student-photo" />
            )}
            <h2>{selectedAlumni.name}</h2>
            <section className="card-section" aria-label={`Contacte de ${selectedAlumni.name}`}>
              <h3>Contacte</h3>
              <ul className="info-list">
                <li><strong>Email:</strong> {selectedAlumni.contact?.email || 'No disponible'}</li>
                <li><strong>Phone:</strong> {selectedAlumni.contact?.phone || 'No disponible'}</li>
                <li>
                  <strong>LinkedIn:</strong>{' '}
                  {selectedAlumni.contact?.linkedin ? (
                    <a href={selectedAlumni.contact.linkedin} target="_blank" rel="noreferrer">
                      Veure perfil
                    </a>
                  ) : (
                    'No disponible'
                  )}
                </li>
              </ul>
            </section>
          </article>
        )}

        {!loading && !error && activeSection === 'restaurants' && (
          <>
            {isAdmin && (
              <section className="admin-panel" aria-label="Accions admin restaurants">
                <h2>Accions administrador</h2>
                <form className="admin-form" onSubmit={handleAddRestaurant}>
                  <input
                    placeholder="Nom restaurant"
                    value={restaurantForm.name}
                    onChange={(event) => setRestaurantForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                  <input
                    placeholder="Email"
                    value={restaurantForm.email}
                    onChange={(event) => setRestaurantForm((prev) => ({ ...prev, email: event.target.value }))}
                  />
                  <input
                    placeholder="Phone"
                    value={restaurantForm.phone}
                    onChange={(event) => setRestaurantForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                  <input
                    placeholder="Photo URL"
                    value={restaurantForm.photoUrl}
                    onChange={(event) => setRestaurantForm((prev) => ({ ...prev, photoUrl: event.target.value }))}
                  />
                  <input
                    placeholder="Latitud"
                    value={restaurantForm.lat}
                    onChange={(event) => setRestaurantForm((prev) => ({ ...prev, lat: event.target.value }))}
                  />
                  <input
                    placeholder="Longitud"
                    value={restaurantForm.lng}
                    onChange={(event) => setRestaurantForm((prev) => ({ ...prev, lng: event.target.value }))}
                  />
                  <button type="submit">Afegir restaurant</button>
                </form>
              </section>
            )}
            <label className="search-label" htmlFor="restaurant-search">Buscar restaurant per nom</label>
            <input
              id="restaurant-search"
              type="search"
              className="search-input"
              placeholder="Ex: Can Jubany"
              value={restaurantSearch}
              onChange={(event) => setRestaurantSearch(event.target.value)}
            />

            <section className="restaurants-overview-map" aria-label="Mapa amb pins de restaurants">
              <h2>Mapa general de restaurants</h2>
              {mapError && <p className="error-message">{mapError}</p>}
              <div ref={mapContainerRef} className="restaurants-map-canvas" />
            </section>

            <section className="restaurant-grid" aria-label="Llista de restaurants al mapa">
              {filteredRestaurants.map((restaurant) => (
                <button
                  key={restaurant.id}
                  type="button"
                  className="card-button"
                  onClick={() => openRestaurantDetail(restaurant)}
                >
                  <article className="restaurant-card">
                    {restaurant.photoUrl ? (
                      <img src={restaurant.photoUrl} alt={restaurant.name} className="restaurant-photo" />
                    ) : (
                      <img
                        src={defaultRestaurantPhoto}
                        alt={`Foto predeterminada de ${restaurant.name}`}
                        className="restaurant-photo"
                      />
                    )}
                    <h2>{restaurant.name}</h2>
                  </article>
                </button>
              ))}
            </section>
          </>
        )}

        {!loading && !error && activeSection === 'restaurant-detail' && selectedRestaurant && (
          <article className="detail-card" aria-label={`Fitxa de ${selectedRestaurant.name}`}>
            <button type="button" className="back-button" onClick={openRestaurantsList}>← Tornar al llistat</button>
            {selectedRestaurant.photoUrl ? (
              <img src={selectedRestaurant.photoUrl} alt={selectedRestaurant.name} className="restaurant-photo" />
            ) : (
              <img
                src={defaultRestaurantPhoto}
                alt={`Foto predeterminada de ${selectedRestaurant.name}`}
                className="restaurant-photo"
              />
            )}
            <h2>{selectedRestaurant.name}</h2>

            <section className="card-section" aria-label={`Ubicació de ${selectedRestaurant.name}`}>
              <h3>Ubicació</h3>
              {selectedRestaurant.location ? (
                <iframe
                  title={`Mapa de ${selectedRestaurant.name}`}
                  className="restaurant-map"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedRestaurant.location.lng - 0.01}%2C${selectedRestaurant.location.lat - 0.01}%2C${selectedRestaurant.location.lng + 0.01}%2C${selectedRestaurant.location.lat + 0.01}&layer=mapnik&marker=${selectedRestaurant.location.lat}%2C${selectedRestaurant.location.lng}`}
                />
              ) : (
                <p>No hi ha coordenades disponibles.</p>
              )}
            </section>

            <section className="card-section" aria-label={`Contacte de ${selectedRestaurant.name}`}>
              <h3>Contacte</h3>
              <ul className="info-list">
                <li><strong>Phone:</strong> {selectedRestaurant.contact?.phone || 'No disponible'}</li>
                <li><strong>Email:</strong> {selectedRestaurant.contact?.email || 'No disponible'}</li>
              </ul>
            </section>

            <section className="card-section" aria-label={`Alumnes de ${selectedRestaurant.name}`}>
              <h3>Llistat alumnes</h3>
              {selectedRestaurant.alumniList?.length ? (
                <ul className="info-list">
                  {selectedRestaurant.alumniList.map((alumniName) => (
                    <li key={alumniName}>{alumniName}</li>
                  ))}
                </ul>
              ) : (
                <p>No hi ha alumnes associats.</p>
              )}
            </section>
          </article>
        )}
        {adminMessage && <p className="info-message">{adminMessage}</p>}
      </main>
        </>
      )}
    </div>
  );
}

export default App;
