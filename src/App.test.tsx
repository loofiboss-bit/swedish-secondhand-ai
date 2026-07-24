import { clear } from 'idb-keyval';
import { cleanup, render, screen, within } from '@testing-library/react';
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
      trash: [],
      activeProjectId: null,
      activeProject: null,
      error: null,
    });
  });

  it('separates the project home from settings and opens a new item workspace', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByRole('heading', { name: /swedish secondhand ai/i })).toBeInTheDocument();
    const startOffline = await screen.findByRole(
      'button',
      { name: /börja offline|start offline/i },
      { timeout: 10_000 },
    );
    await user.click(startOffline);
    expect(
      await screen.findByRole('heading', { name: /från pryl|from item/i }, { timeout: 10_000 }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /inställningar|settings/i }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ny vara|new item/i }));
    await user.type(screen.getByRole('textbox', { name: /projektnamn|project name/i }), 'Min stol');
    await user.type(
      screen.getByRole('textbox', { name: /beskrivning|description/i }),
      'IKEA stol i gott skick',
    );
    await user.click(
      screen.getByRole('button', { name: /skapa och fortsätt|create and continue/i }),
    );

    const workspaceNavigation = await screen.findByRole(
      'navigation',
      { name: /arbetsyta för vara|item workspace/i },
      { timeout: 10_000 },
    );
    expect(
      within(workspaceNavigation).getByRole('button', { name: /pris|price/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^vara$|^item$/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /inställningar|settings/i }));
    expect(
      await screen.findByRole('heading', { name: /inställningar|settings/i }, { timeout: 15_000 }),
    ).toBeInTheDocument();
  }, 35_000);
});
