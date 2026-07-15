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
    traderaBaseUrl: 'https://api.tradera.com/v3',
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
  traderaBaseUrl: 'https://api.tradera.com/v3',
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

  it('defaults to offline and persists an explicit provider and fallback choice', async () => {
    const user = userEvent.setup();
    render(<OnboardingDialog />);

    expect(screen.getByRole('radio', { name: /offline/i })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /gemini/i }));
    await user.click(screen.getByRole('checkbox', { name: /offlineanalys|offline analysis/i }));
    await user.click(screen.getByRole('button', { name: /spara och börja|save and start/i }));

    await waitFor(() => expect(completeOnboardingMock).toHaveBeenCalledWith('sv', 'gemini', true));
  });
});
