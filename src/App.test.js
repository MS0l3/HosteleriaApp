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


test('filtra alumnes pel nom al cercador', async () => {
  fetchAlumni.mockResolvedValue([
    { id: 'a1', name: 'Marta', photoUrl: '' },
    { id: 'a2', name: 'Joan', photoUrl: '' },
  ]);

  render(<App />);

  expect(await screen.findByText('Marta')).toBeInTheDocument();
  expect(screen.getByText('Joan')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/buscar alumne per nom/i), {
    target: { value: 'mar' },
  });

  expect(screen.getByText('Marta')).toBeInTheDocument();
  expect(screen.queryByText('Joan')).not.toBeInTheDocument();
});

test('filtra restaurants pel nom al cercador del mapa', async () => {
  fetchRestaurants.mockResolvedValue([
    { id: 'rest-1', name: 'Can Jubany', location: { lat: 41.92, lng: 2.3 } },
    { id: 'rest-2', name: 'Disfrutar', location: { lat: 41.39, lng: 2.16 } },
  ]);

  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /veure restaurants al mapa/i }));

  expect(await screen.findByText('Can Jubany')).toBeInTheDocument();
  expect(screen.getByText('Disfrutar')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/buscar restaurant per nom/i), {
    target: { value: 'dis' },
  });

  expect(screen.getByText('Disfrutar')).toBeInTheDocument();
  expect(screen.queryByText('Can Jubany')).not.toBeInTheDocument();
});
