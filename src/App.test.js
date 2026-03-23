import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { fetchAlumni, fetchRestaurants } from './alumniApi';

jest.mock('./alumniApi', () => ({
  fetchAlumni: jest.fn(),
  fetchRestaurants: jest.fn(),
}));

const login = () => {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'user@test.com' } });
  fireEvent.change(screen.getByLabelText(/contrasenya/i), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
};

beforeEach(() => {
  fetchAlumni.mockResolvedValue([]);
  fetchRestaurants.mockResolvedValue([]);
  window.scrollTo = jest.fn();
});

test('muestra la pantalla de login inicialmente', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/contrasenya/i)).toBeInTheDocument();
});

test('permite login y muestra botón de logout', async () => {
  render(<App />);
  login();

  expect(await screen.findByRole('heading', { name: /visualitzar alumnes/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
  await waitFor(() => expect(fetchAlumni).toHaveBeenCalled());
});

test('permite logout y vuelve al login', async () => {
  render(<App />);
  login();

  expect(await screen.findByRole('button', { name: /logout/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /logout/i }));

  expect(await screen.findByRole('heading', { name: /login/i })).toBeInTheDocument();
});

test('filtra alumnes pel nom al cercador', async () => {
  fetchAlumni.mockResolvedValue([
    { id: 'a1', name: 'Marta', photoUrl: '' },
    { id: 'a2', name: 'Joan', photoUrl: '' },
  ]);

  render(<App />);
  login();

  expect(await screen.findByText('Marta')).toBeInTheDocument();
  expect(screen.getByText('Joan')).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/buscar alumne per nom/i), {
    target: { value: 'mar' },
  });

  expect(screen.getByText('Marta')).toBeInTheDocument();
  expect(screen.queryByText('Joan')).not.toBeInTheDocument();
});

test('obre la fitxa de restaurant en una pàgina dedicada', async () => {
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
  login();

  fireEvent.click(await screen.findByRole('button', { name: /veure restaurants al mapa/i }));
  expect(await screen.findByText('Can Escola')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /can escola/i }));
  expect(await screen.findByRole('heading', { name: /fitxa restaurant: can escola/i })).toBeInTheDocument();

  expect(screen.getByText('938000000')).toBeInTheDocument();
  expect(screen.getByText('info@canescola.cat')).toBeInTheDocument();
  expect(screen.getByText('Anna Puig')).toBeInTheDocument();
  expect(screen.getByText('Marc Vila')).toBeInTheDocument();
});
