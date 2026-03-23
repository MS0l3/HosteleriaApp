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

test('mostra la fitxa de contacte dels alumnes', async () => {
  fetchAlumni.mockResolvedValue([
    {
      id: 'a1',
      name: 'Marta Soler',
      photoUrl: '',
      contact: {
        email: 'marta@demo.cat',
        phone: '600123123',
        linkedin: 'https://linkedin.com/in/martasoler',
      },
    },
  ]);

  render(<App />);

  expect(await screen.findByText('Marta Soler')).toBeInTheDocument();
  expect(screen.getByText(/Email:/i)).toBeInTheDocument();
  expect(screen.getByText('marta@demo.cat')).toBeInTheDocument();
  expect(screen.getByText(/Phone:/i)).toBeInTheDocument();
  expect(screen.getByText('600123123')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /veure perfil/i })).toHaveAttribute(
    'href',
    'https://linkedin.com/in/martasoler'
  );
});

test('mostra la fitxa completa del restaurant amb ubicació, contacte i alumnes', async () => {
  fetchRestaurants.mockResolvedValue([
    {
      id: 'rest-1',
      name: 'Can Escola',
      location: { lat: 41.4, lng: 2.1 },
      contact: { phone: '938000000', email: 'info@canescola.cat' },
      alumniList: ['Anna Puig', 'Marc Vila'],
    },
  ]);

  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: /veure restaurants al mapa/i }));

  expect(await screen.findByText('Can Escola')).toBeInTheDocument();
  expect(screen.getByText(/Ubicació/i)).toBeInTheDocument();
  expect(screen.getByText(/Contacte/i)).toBeInTheDocument();
  expect(screen.getByText(/Llistat alumnes/i)).toBeInTheDocument();
  expect(screen.getByText('938000000')).toBeInTheDocument();
  expect(screen.getByText('info@canescola.cat')).toBeInTheDocument();
  expect(screen.getByText('Anna Puig')).toBeInTheDocument();
  expect(screen.getByText('Marc Vila')).toBeInTheDocument();
});
