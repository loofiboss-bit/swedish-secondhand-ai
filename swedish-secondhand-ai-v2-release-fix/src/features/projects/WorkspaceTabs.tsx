import { useTranslation } from 'react-i18next';
import type { ProjectSection } from '@core/types';

interface WorkspaceTabsProps {
  active: ProjectSection;
  onChange: (section: ProjectSection) => void;
}

const SECTIONS: ProjectSection[] = ['item', 'market', 'listing', 'follow-up'];

export function WorkspaceTabs({ active, onChange }: WorkspaceTabsProps) {
  const { t } = useTranslation('common');
  return (
    <nav className="workspace-tabs" aria-label={t('projectWorkspace')}>
      {SECTIONS.map((section) => (
        <button
          key={section}
          type="button"
          className={active === section ? 'is-active' : ''}
          aria-current={active === section ? 'page' : undefined}
          onClick={() => onChange(section)}
        >
          {t(`projectSection_${section}`)}
        </button>
      ))}
    </nav>
  );
}
