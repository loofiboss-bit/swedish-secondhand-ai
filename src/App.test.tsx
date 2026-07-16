import { clear } from 'idb-keyval';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PROJECT_STORE } from '@core/services/projectRepository';
import { useProjectStore } from '@core/store/useProjectStore';
import { App } from './App';

describe('App project shell', () => {
  afterEach(cleanup);

  beforeEach(async () => {
    await clear();
    await clear(PROJECT_STORE);
    localStorage.clear();
    useProjectStore.setState({
      status: 'idle',
      projects: [],
      activeProjectId: null,
      activeProject: null,
      error: null,
    });
  });

  it('separates the project home from settings and opens a new item workspace', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: /swedish secondhand ai/i })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /från pryl|from item/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /inställningar|settings/i }),
    ).not.toBeInTheDocument();

    const dialog = screen.queryByRole('dialog', { name: /välkommen|welcome/i });
    if (dialog)
      await user.click(screen.getByRole('button', { name: /spara och börja|save and start/i }));
    await user.click(screen.getByRole('button', { name: /ny vara|new item/i }));

    expect(
      await screen.findByRole(
        'button',
        { name: /marknad & pris|market & price/i },
        { timeout: 10_000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /analysera|analyze/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /inställningar|settings/i }));
    expect(
      await screen.findByRole('heading', { name: /inställningar|settings/i }),
    ).toBeInTheDocument();
  });
});
