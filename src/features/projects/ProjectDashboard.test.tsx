import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../../core/config/i18n';
import type { ProjectSummary } from '@core/types';
import { evaluateProjectReadiness } from '@core/services/projectReadinessService';
import { ProjectDashboard } from './ProjectDashboard';

const project: ProjectSummary = {
  id: 'project-1',
  displayName: 'Camera',
  title: 'Camera',
  status: 'draft',
  updatedAt: '2026-07-24T08:00:00.000Z',
  recommendedPriceSek: null,
  selectedPriceSek: null,
  selectedMarketplace: null,
  readiness: evaluateProjectReadiness({
    facts: null,
    photos: [],
    comparables: [],
    valuation: null,
    priceDecision: { kind: 'unset' },
    listingDrafts: [],
    projectStatus: 'draft',
  }),
};

function renderDashboard(overrides: Partial<Parameters<typeof ProjectDashboard>[0]> = {}) {
  const props: Parameters<typeof ProjectDashboard>[0] = {
    mode: 'library',
    projects: [project],
    trash: [],
    onCreate: vi.fn(),
    onOpen: vi.fn(),
    onRemove: vi.fn(),
    onRestore: vi.fn(),
    onEmptyTrash: vi.fn(),
    onRename: vi.fn(),
    onArchive: vi.fn(),
    ...overrides,
  };
  render(<ProjectDashboard {...props} />);
  return props;
}

describe('ProjectDashboard', () => {
  afterEach(cleanup);

  it('supports focus entry, arrow navigation, and Escape in project action menus', async () => {
    const user = userEvent.setup();
    renderDashboard();
    const trigger = screen.getByRole('button', { name: /project actions|projektåtgärder/i });

    await user.click(trigger);
    const menuItems = screen.getAllByRole('menuitem');
    await waitFor(() => expect(menuItems[0]).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    expect(menuItems[1]).toHaveFocus();
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('shows the unified readiness stage, next action, save time, price, and marketplace state', () => {
    renderDashboard();

    const projectButton = screen.getByRole('button', {
      name: /current stage.*item|aktuellt steg.*vara/i,
    });
    expect(projectButton).toHaveTextContent(/current stage.*item|aktuellt steg.*vara/i);
    expect(projectButton).toHaveTextContent(
      /next important task.*complete item facts|nästa viktiga uppgift.*komplettera varufakta/i,
    );
    expect(projectButton).toHaveTextContent(/last saved|senast sparad/i);
    expect(projectButton).toHaveTextContent(/no price|no numeric price|inget numeriskt pris/i);
  });

  it('validates rename in an accessible in-app dialog', async () => {
    const user = userEvent.setup();
    const props = renderDashboard();
    await user.click(screen.getByRole('button', { name: /project actions|projektåtgärder/i }));
    await user.click(screen.getByRole('menuitem', { name: /rename|byt namn/i }));
    const input = screen.getByRole('textbox', { name: /project name|projektnamn/i });
    await user.clear(input);
    await user.click(screen.getByRole('button', { name: /save name|spara namn/i }));
    expect(screen.getByRole('alert')).toHaveTextContent(/enter|ange/i);
    await user.type(input, 'New camera name');
    await user.click(screen.getByRole('button', { name: /save name|spara namn/i }));

    expect(props.onRename).toHaveBeenCalledWith('project-1', 'New camera name');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('moves a project to trash without opening it', async () => {
    const user = userEvent.setup();
    const props = renderDashboard();
    await user.click(screen.getByRole('button', { name: /project actions|projektåtgärder/i }));
    await user.click(screen.getByRole('menuitem', { name: /move to trash|papperskorgen/i }));

    expect(props.onRemove).toHaveBeenCalledWith('project-1');
    expect(props.onOpen).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(/trash|papperskorgen/i);
  });

  it('requires an explicit dialog confirmation before emptying trash', async () => {
    const user = userEvent.setup();
    const props = renderDashboard({ projects: [], trash: [project] });
    await user.click(screen.getByRole('button', { name: /empty trash|töm papperskorgen/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /empty permanently|töm permanent/i }));
    expect(props.onEmptyTrash).toHaveBeenCalledOnce();
  });
});
