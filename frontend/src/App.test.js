import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div>{children}</div>,
  TileLayer: () => <div>TileLayer</div>,
  Marker: () => <div>Marker</div>,
  Popup: () => <div>Popup</div>,
  Circle: () => <div>Circle</div>,
}));

jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: { alerts: [] } })),
}));

test('renders AirAlert Dashboard header', () => {
  render(<App />);
  const headerElement = screen.getByText(/AirAlert Dashboard/i);
  expect(headerElement).toBeInTheDocument();
});
