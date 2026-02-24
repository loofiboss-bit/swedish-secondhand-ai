import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders key sections', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /swedish secondhand ai/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /analysera|analyze/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /mallar|templates/i })).toBeInTheDocument();
  });
});
