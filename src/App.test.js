import { render, screen } from '@testing-library/react';
import App from './App';

test('muestra el logo de joviat en el encabezado', () => {
  render(<App />);
  const logoElement = screen.getByAltText(/logo_joviat/i);
  expect(logoElement).toBeInTheDocument();
});
