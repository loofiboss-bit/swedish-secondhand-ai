import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useValuationStore } from '@core/store/useValuationStore';
import { useWorkflowStore } from '@core/store/useWorkflowStore';
import { SectionCard } from '@shared/components/SectionCard';

async function fileToDataUrl(file: File): Promise<string> {
  if (typeof createImageBitmap === 'undefined') {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  const bitmap = await createImageBitmap(file);
  const maxSize = 1280;
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not process image');
  context.drawImage(bitmap, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', 0.82);
}

export function AnalyzePanel() {
  const { t } = useTranslation('common');
  const {
    inputText,
    images,
    fingerprint,
    loading,
    error,
    setInputText,
    addImage,
    removeImage,
    analyzeItem,
    runPipeline,
  } = useValuationStore();
  const { stepErrors } = useWorkflowStore();

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
        <div className="inline-actions">
          <button type="button" onClick={() => void analyzeItem()} disabled={loading}>
            {t('analyzeItem')}
          </button>
          <button type="button" onClick={() => void runPipeline()} disabled={loading}>
            {t('runFullPipeline')}
          </button>
        </div>
      }
    >
      {(error || stepErrors.analyze) && (
        <p className="inline-warning" role="alert">
          {stepErrors.analyze || error}
        </p>
      )}

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
            <li key={`${image}-${index}`}>
              <img src={image} alt={`upload-${index + 1}`} loading="lazy" decoding="async" />
              <button type="button" onClick={() => removeImage(index)}>
                {t('remove')}
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
            <dt>{t('category')}</dt>
            <dd>{fingerprint.category}</dd>
            <dt>{t('brand')}</dt>
            <dd>{fingerprint.brand}</dd>
            <dt>{t('model')}</dt>
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
