import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { addAlumni, addRestaurant, fetchAlumni, fetchRestaurants, isAdministrator } from './alumniApi';

jest.mock('./alumniApi', () => ({
  fetchAlumni: jest.fn(),
  fetchRestaurants: jest.fn(),
  isAdministrator: jest.fn(),
  addAlumni: jest.fn(),
  addRestaurant: jest.fn(),
}));

const login = async (email = 'user@test.com') => {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/contrasenya/i), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: /entrar/i }));
  await waitFor(() => expect(isAdministrator).toHaveBeenCalled());
};

beforeEach(() => {
  fetchAlumni.mockResolvedValue([]);
  fetchRestaurants.mockResolvedValue([]);
  isAdministrator.mockResolvedValue(false);
  addAlumni.mockResolvedValue({});
  addRestaurant.mockResolvedValue({});
  window.scrollTo = jest.fn();
  window.localStorage.clear();
});

test('muestra la pantalla de login inicialmente', () => {
  render(<App />);

  expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
});

test('consulta Administrator al hacer login', async () => {
  isAdministrator.mockResolvedValue(true);
  render(<App />);

  await login('admin@test.com');

  expect(isAdministrator).toHaveBeenCalledWith('admin@test.com');
  expect(window.localStorage.getItem('hosteleriaapp-admin')).toBe('true');
});

test('muestra acciones de admin si el email está en Administrator', async () => {
  isAdministrator.mockResolvedValue(true);
  render(<App />);

  await login('admin@test.com');

  expect(await screen.findByRole('button', { name: /afegir alumne/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /afegir alumne/i }));
  expect(await screen.findByLabelText(/accions admin alumnes/i)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText(/nom complet/i), { target: { value: 'Joana' } });
  fireEvent.click(screen.getByRole('button', { name: /desar alumne/i }));

  await waitFor(() => expect(addAlumni).toHaveBeenCalled());
});

test('muestra botón de afegir restaurant solo para admin y abre la fitxa', async () => {
  isAdministrator.mockResolvedValue(true);
  render(<App />);

  await login('admin@test.com');
  fireEvent.click(screen.getByRole('button', { name: /veure restaurants al mapa/i }));

  expect(await screen.findByRole('button', { name: /afegir restaurant/i })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /afegir restaurant/i }));
  expect(await screen.findByLabelText(/accions admin restaurants/i)).toBeInTheDocument();
});

test('no muestra acciones de admin si no es administrador', async () => {
  isAdministrator.mockResolvedValue(false);
  render(<App />);

  await login('user@test.com');

  expect(await screen.findByRole('heading', { name: /visualitzar alumnes/i })).toBeInTheDocument();
  expect(screen.queryByLabelText(/accions admin alumnes/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /afegir alumne/i })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /veure restaurants al mapa/i }));
  expect(screen.queryByRole('button', { name: /afegir restaurant/i })).not.toBeInTheDocument();
});

test('mantiene sesión al refrescar y conserva rol admin', async () => {
  window.localStorage.setItem('hosteleriaapp-auth', 'true');
  window.localStorage.setItem('hosteleriaapp-admin', 'true');
  render(<App />);

  expect(await screen.findByRole('heading', { name: /visualitzar alumnes/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /afegir alumne/i })).toBeInTheDocument();
});

test('logout limpia sesión y rol admin', async () => {
  isAdministrator.mockResolvedValue(true);
  render(<App />);
  await login('admin@test.com');

  fireEvent.click(screen.getByRole('button', { name: /logout/i }));

  expect(await screen.findByRole('heading', { name: /login/i })).toBeInTheDocument();
  expect(window.localStorage.getItem('hosteleriaapp-auth')).toBeNull();
  expect(window.localStorage.getItem('hosteleriaapp-admin')).toBeNull();
});

test('desde fitxa restaurant se puede abrir la fitxa del alumne relacionado', async () => {
  fetchRestaurants.mockResolvedValue([
    {
      id: 'rest-1',
      name: 'Can Test',
      contact: {},
      alumniMembers: [
        {
          id: 'alum-1',
          name: 'Anna Soler',
          photoUrl: '',
          currentJob: true,
        },
      ],
    },
  ]);
  fetchAlumni.mockResolvedValue([
    {
      id: 'alum-1',
      name: 'Anna Soler',
      photoUrl: '',
      contact: { email: 'anna@test.com', phone: '', linkedin: '' },
    },
  ]);

  render(<App />);
  await login('user@test.com');

  fireEvent.click(screen.getByRole('button', { name: /veure restaurants al mapa/i }));
  fireEvent.click(await screen.findByRole('button', { name: /can test/i }));
  fireEvent.click(await screen.findByRole('button', { name: /anna soler/i }));

  expect(await screen.findByRole('heading', { name: /fitxa alumne: anna soler/i })).toBeInTheDocument();
});
