import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

test('muestra el logo de joviat en el encabezado', () => {
  render(<App />);
  const logoElement = screen.getByAltText(/logo_joviat/i);
  expect(logoElement).toBeInTheDocument();
});

test('permite ocultar la barra lateral con el botón del menú', () => {
  render(<App />);
  const sidebarLink = screen.getByRole('link', { name: /inicio/i });
  expect(sidebarLink).toBeInTheDocument();

  const toggleButton = screen.getByRole('button', { name: /ocultar barra lateral/i });
  fireEvent.click(toggleButton);

  expect(screen.getByRole('button', { name: /mostrar barra lateral/i })).toBeInTheDocument();
});
