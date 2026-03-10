import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { fetchAlumni, fetchRestaurants } from './alumniApi';

jest.mock('./alumniApi', () => ({
  fetchAlumni: jest.fn(),
  fetchRestaurants: jest.fn(),
}));

beforeEach(() => {
  fetchAlumni.mockResolvedValue([]);
  fetchRestaurants.mockResolvedValue([]);
  window.scrollTo = jest.fn();
});

test('muestra el logo de joviat en el encabezado', async () => {
  render(<App />);

  const logoElement = screen.getByAltText(/logo_joviat/i);
  expect(logoElement).toBeInTheDocument();

  await waitFor(() => expect(fetchAlumni).toHaveBeenCalled());
});

test('el logo vuelve a la página inicial', async () => {
  render(<App />);

  fireEvent.click(screen.getByRole('button', { name: /veure restaurants al mapa/i }));
  expect(await screen.findByRole('heading', { name: /restaurants al mapa/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /anar a la pàgina inicial/i }));
  expect(await screen.findByRole('heading', { name: /visualitzar alumnes/i })).toBeInTheDocument();
  expect(window.scrollTo).toHaveBeenCalled();
});

test('permite ocultar la barra lateral con el botón del menú', async () => {
  render(<App />);

  const toggleButton = screen.getByRole('button', { name: /ocultar barra lateral/i });
  fireEvent.click(toggleButton);
  expect(screen.getByRole('button', { name: /mostrar barra lateral/i })).toBeInTheDocument();

  await waitFor(() => expect(fetchAlumni).toHaveBeenCalled());
});

test('muestra alumnos cuando firebase responde', async () => {
  fetchAlumni.mockResolvedValue([{ id: 'abc', name: 'Kiana', photoUrl: '' }]);
  render(<App />);

  expect(await screen.findByText('Kiana')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /visualitzar alumnes/i })).toBeInTheDocument();
});

test('permite ver restaurantes en el mapa desde el menú', async () => {
  fetchRestaurants.mockResolvedValue([
    { id: 'rest-1', name: 'Can Jubany', location: { lat: 41.92, lng: 2.30 } },
  ]);

  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /veure restaurants al mapa/i }));

  expect(await screen.findByText('Can Jubany')).toBeInTheDocument();
  expect(screen.getByLabelText(/mapa amb pins de restaurants/i)).toBeInTheDocument();
  expect(screen.getByTitle(/mapa de can jubany/i)).toBeInTheDocument();
  await waitFor(() => expect(fetchRestaurants).toHaveBeenCalled());
});
