import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import { fetchAlumni } from './alumniApi';

jest.mock('./alumniApi', () => ({
  fetchAlumni: jest.fn(),
}));

test('muestra el logo de joviat en el encabezado', async () => {
  fetchAlumni.mockResolvedValue([]);
  render(<App />);

  const logoElement = screen.getByAltText(/logo_joviat/i);
  expect(logoElement).toBeInTheDocument();

  await waitFor(() => expect(fetchAlumni).toHaveBeenCalled());
});

test('permite ocultar la barra lateral con el botón del menú', async () => {
  fetchAlumni.mockResolvedValue([]);
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
