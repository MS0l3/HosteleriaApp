import { useState } from 'react';
import logoJoviat from './logo_joviat.webp';
import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarOpen((prevOpen) => !prevOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="app-layout">
      <header className="top-header">
        <button
          type="button"
          className="menu-button"
          aria-label="Abrir barra lateral"
          onClick={toggleSidebar}
        >
          ☰
        </button>

        <img src={logoJoviat} className="header-logo" alt="logo_joviat" />
      </header>

      <aside className={`sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <nav>
          <ul>
            <li><a href="#inicio">Inicio</a></li>
            <li><a href="#reservas">Reservas</a></li>
            <li><a href="#menu">Menú</a></li>
            <li><a href="#contacto">Contacto</a></li>
          </ul>
        </nav>
      </aside>

      {sidebarOpen && <button className="overlay" onClick={closeSidebar} aria-label="Cerrar barra lateral" />}

      <main className="content">
        <h1>Bienvenido</h1>
        <p>Tu contenido principal se adapta para móviles y PC.</p>
      </main>
    </div>
  );
}

export default App;
