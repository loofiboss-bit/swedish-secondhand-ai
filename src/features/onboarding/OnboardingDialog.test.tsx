import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppSettings } from '@core/types';
import '@core/config/i18n';

const { completeOnboardingMock } = vi.hoisted(() => ({
  completeOnboardingMock: vi.fn(),
}));

vi.mock('@core/services/settingsService', () => ({
  DEFAULT_APP_SETTINGS: {
    language: 'sv',
    currency: 'SEK',
    traderaAppId: 1234,
    aiMode: 'offline',
    fallbackEnabled: false,
    onboardingCompleted: false,
    secretStatus: {
      geminiConfigured: false,
      traderaConfigured: false,
      encryptionAvailable: false,
      migrationStatus: 'not-needed',
    },
  },
  settingsService: {
    completeOnboarding: completeOnboardingMock,
  },
}));

import { OnboardingDialog } from './OnboardingDialog';
import { useSettingsStore } from '@core/store/useSettingsStore';

const initialSettings: AppSettings = {
  language: 'sv',
  currency: 'SEK',
  traderaAppId: 1234,
  aiMode: 'offline',
  fallbackEnabled: false,
  onboardingCompleted: false,
  secretStatus: {
    geminiConfigured: false,
    traderaConfigured: false,
    encryptionAvailable: false,
    migrationStatus: 'not-needed',
  },
};

describe('OnboardingDialog', () => {
  beforeEach(() => {
    completeOnboardingMock.mockResolvedValue({ ...initialSettings, onboardingCompleted: true });
    useSettingsStore.setState({ settings: initialSettings, error: null });
  });

  afterEach(cleanup);

  it('starts offline immediately without requiring provider configuration', async () => {
    const user = userEvent.setup();
    const onStarted = vi.fn();
    render(<OnboardingDialog onStarted={onStarted} />);

    expect(screen.getByText(/ingen inloggning|no sign-in/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /börja offline|start offline/i }));

    await waitFor(() =>
      expect(completeOnboardingMock).toHaveBeenCalledWith('sv', 'offline', false),
    );
    expect(onStarted).toHaveBeenCalledWith(false);
  });

  it('creates the optional example only after completing local onboarding', async () => {
    const user = userEvent.setup();
    const onStarted = vi.fn();
    render(<OnboardingDialog onStarted={onStarted} />);

    await user.click(screen.getByRole('button', { name: /prova med exempel|try an example/i }));

    await waitFor(() => expect(onStarted).toHaveBeenCalledWith(true));
  });
});
