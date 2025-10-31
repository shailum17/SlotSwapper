import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from './App';

test('renders SlotSwapper heading', () => {
  render(<App />);
  const linkElement = screen.getByText(/SlotSwapper/i);
  expect(linkElement).toBeInTheDocument();
});