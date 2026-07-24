import { ChangeEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  backupService,
  MAX_BACKUP_BYTES,
  type BackupDatasetId,
} from '@core/services/backupService';
import { SectionCard } from '@shared/components/SectionCard';
import { diagnosticsService } from '@core/services/diagnosticsService';
import { useProjectStore } from '@core/store/useProjectStore';
import { useSettingsStore } from '@core/store/useSettingsStore';
import { useValuationStore } from '@core/store/useValuationStore';

const DATASETS: BackupDatasetId[] = [
  'projects',
  'settings',
  'listing-draft',
  'history',
  'manual-comparables',
];

export function DataManagementPanel() {
  const { t } = useTranslation('common');
  const [selected, setSelected] = useState<BackupDatasetId[]>(DATASETS);
  const [message, setMessage] = useState('');
  const projectState = useProjectStore((state) => state.status);
  const projectError = useProjectStore((state) => state.error);
  const settings = useSettingsStore((state) => state.settings);
  const settingsError = useSettingsStore((state) => state.error);
  const valuationError = useValuationStore((state) => state.error);

  const exportDiagnostics = () => {
    const data = diagnosticsService.create({
      settings,
      projectState,
      errors: [projectError, settingsError, valuationError],
    });
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `swedish-secondhand-ai-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage(t('diagnosticsExported'));
  };

  const toggle = (dataset: BackupDatasetId) => {
    setSelected((current) =>
      current.includes(dataset)
        ? current.filter((entry) => entry !== dataset)
        : [...current, dataset],
    );
  };

  const exportBackup = async (includeProjectImages: boolean) => {
    const json = await backupService.exportJson(new Date(), includeProjectImages);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `swedish-secondhand-ai-${includeProjectImages ? 'full' : 'compact'}-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage(t('backupExported'));
  };

  const importBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || selected.length === 0 || !window.confirm(t('confirmImport'))) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Backup is too large.');
      await backupService.importBackup(await file.text(), selected);
      setMessage(t('backupImported'));
    } catch {
      setMessage(t('backupInvalid'));
    }
  };

  const reset = async (datasets: BackupDatasetId[]) => {
    if (datasets.length === 0 || !window.confirm(t('confirmReset'))) return;
    await backupService.reset(datasets);
    if (datasets.length === DATASETS.length) {
      localStorage.removeItem('swedish-secondhand-ai:workflow');
    }
    setMessage(t('dataResetComplete'));
  };

  return (
    <SectionCard title={t('dataManagement')}>
      <p>{t('backupPrivacyNote')}</p>
      <fieldset>
        <legend>{t('selectDatasets')}</legend>
        {DATASETS.map((dataset) => (
          <label key={dataset}>
            <input
              type="checkbox"
              checked={selected.includes(dataset)}
              onChange={() => toggle(dataset)}
            />{' '}
            {t(`dataset_${dataset}`)}
          </label>
        ))}
      </fieldset>
      <div className="inline-actions">
        <button type="button" onClick={() => void exportBackup(true)}>
          {t('exportBackup')}
        </button>
        <button type="button" onClick={() => void exportBackup(false)}>
          {t('exportCompactBackup')}
        </button>
        <button type="button" onClick={exportDiagnostics}>
          {t('exportDiagnostics')}
        </button>
        <label className="button-like">
          {t('importSelected')}
          <input type="file" accept="application/json,.json" onChange={importBackup} />
        </label>
        <button type="button" onClick={() => void reset(selected)}>
          {t('resetSelected')}
        </button>
        <button type="button" onClick={() => void reset(DATASETS)}>
          {t('resetAllNonSecret')}
        </button>
      </div>
      {message && <p role="status">{message}</p>}
    </SectionCard>
  );
}
