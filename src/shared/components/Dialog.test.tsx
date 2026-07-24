import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from './Dialog';

describe('Dialog', () => {
  afterEach(cleanup);

  it('moves focus inside, closes with Escape, and restores focus', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(
      <>
        <button type="button">Open dialog</button>
        <Dialog
          open={false}
          title="Confirm action"
          closeLabel="Close"
          onClose={onClose}
          actions={<button type="button">Confirm</button>}
        />
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'Open dialog' });
    trigger.focus();

    rerender(
      <>
        <button type="button">Open dialog</button>
        <Dialog
          open
          title="Confirm action"
          closeLabel="Close"
          onClose={onClose}
          actions={<button type="button">Confirm</button>}
        />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();

    rerender(
      <>
        <button type="button">Open dialog</button>
        <Dialog
          open={false}
          title="Confirm action"
          closeLabel="Close"
          onClose={onClose}
          actions={<button type="button">Confirm</button>}
        />
      </>,
    );
    expect(screen.getByRole('button', { name: 'Open dialog' })).toHaveFocus();
  });
});
