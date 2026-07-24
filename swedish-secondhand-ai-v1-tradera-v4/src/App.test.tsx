import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders guided workflow shell', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /swedish secondhand ai/i })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /analysera|analyze/i })).toBeInTheDocument();
    expect(
      await screen.findByRole('button', { name: /jämförelser|comparables/i }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /inställningar|settings/i }),
    ).toBeInTheDocument();
  });
});
