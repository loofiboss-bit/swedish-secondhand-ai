import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useValuationStore } from '@core/store/useValuationStore';
import { SectionCard } from '@shared/components/SectionCard';

async function fileToDataUrl(file: File): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AnalyzePanel() {
  const { t } = useTranslation('common');
  const {
    inputText,
    images,
    fingerprint,
    loading,
    setInputText,
    addImage,
    removeImage,
    analyzeItem,
  } = useValuationStore();

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files;
    if (!fileList) return;

    for (const file of Array.from(fileList)) {
      const dataUrl = await fileToDataUrl(file);
      addImage(dataUrl);
    }

    event.target.value = '';
  };

  return (
    <SectionCard
      title={t('analyze')}
      action={
        <button type="button" onClick={() => void analyzeItem()} disabled={loading}>
          {t('analyzeItem')}
        </button>
      }
    >
      <label className="field">
        <span>{t('itemDescription')}</span>
        <textarea
          value={inputText}
          onChange={(event) => setInputText(event.target.value)}
          rows={5}
          placeholder="Ex: IKEA Poang fåtölj i bra skick, grå klädsel"
        />
      </label>

      <label className="field">
        <span>{t('uploadImages')}</span>
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={(event) => void handleUpload(event)}
        />
      </label>

      {images.length > 0 && (
        <ul className="image-list">
          {images.map((image, index) => (
            <li key={image}>
              <img src={image} alt={`upload-${index + 1}`} />
              <button type="button" onClick={() => removeImage(index)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {fingerprint && (
        <div className="detected-item" aria-label={t('detectedItem')}>
          <h3>{t('detectedItem')}</h3>
          <dl>
            <dt>{t('title')}</dt>
            <dd>{fingerprint.title}</dd>
            <dt>Category</dt>
            <dd>{fingerprint.category}</dd>
            <dt>Brand</dt>
            <dd>{fingerprint.brand}</dd>
            <dt>Model</dt>
            <dd>{fingerprint.model}</dd>
            <dt>{t('condition')}</dt>
            <dd>{fingerprint.conditionGrade}</dd>
            <dt>{t('confidence')}</dt>
            <dd>{Math.round(fingerprint.confidence * 100)}%</dd>
          </dl>
        </div>
      )}
    </SectionCard>
  );
}
