import { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { ProductFactKey, ProductListFactKey } from '@core/types';
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
    productFacts,
    loading,
    error,
    setInputText,
    addImage,
    removeImage,
    updateFact,
    updateListFact,
    setTestedStatus,
    setAuthenticityStatus,
    setFactLocked,
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

      {fingerprint && productFacts && (
        <div className="detected-item" aria-label={t('detectedItem')}>
          <h3>{t('detectedItem')}</h3>
          {(
            [
              ['title', t('title')],
              ['category', t('category')],
              ['brand', t('brand')],
              ['model', t('model')],
            ] as Array<[ProductFactKey, string]>
          ).map(([key, label]) => {
            const fact = productFacts[key];
            return (
              <label className="field" key={key}>
                <span>
                  {label} — {t('factSource')}: {fact.source}
                </span>
                <input
                  key={`${key}-${fact.value}`}
                  defaultValue={String(fact.value)}
                  onBlur={(event) => updateFact(key, event.target.value)}
                />
                <span>
                  <input
                    type="checkbox"
                    checked={fact.locked}
                    onChange={(event) => setFactLocked(key, event.target.checked)}
                  />{' '}
                  {t('lockFact')}
                </span>
              </label>
            );
          })}
          <label className="field">
            <span>
              {t('condition')} — {t('factSource')}: {productFacts.conditionGrade.source}
            </span>
            <select
              value={productFacts.conditionGrade.value}
              onChange={(event) => updateFact('conditionGrade', event.target.value)}
            >
              {['new', 'like_new', 'good', 'fair', 'poor', 'unknown'].map((condition) => (
                <option key={condition} value={condition}>
                  {condition}
                </option>
              ))}
            </select>
            <span>
              <input
                type="checkbox"
                checked={productFacts.conditionGrade.locked}
                onChange={(event) => setFactLocked('conditionGrade', event.target.checked)}
              />{' '}
              {t('lockFact')}
            </span>
          </label>
          <label className="field">
            <span>{t('authenticityStatus')}</span>
            <select
              value={productFacts.authenticityStatus.value}
              onChange={(event) =>
                setAuthenticityStatus(event.target.value as 'verified' | 'unverified' | 'unknown')
              }
            >
              <option value="verified">{t('authenticityVerified')}</option>
              <option value="unverified">{t('authenticityUnverified')}</option>
              <option value="unknown">{t('unknown')}</option>
            </select>
          </label>
          {(
            [
              ['defects', t('defects')],
              ['includedAccessories', t('includedAccessories')],
              ['missingAccessories', t('missingAccessories')],
            ] as Array<[ProductListFactKey, string]>
          ).map(([key, label]) => (
            <label className="field" key={key}>
              <span>{label}</span>
              <input
                defaultValue={productFacts[key].value.join(', ')}
                onBlur={(event) => updateListFact(key, event.target.value)}
                placeholder={t('commaSeparated')}
              />
            </label>
          ))}
          <label className="field">
            <span>{t('testedStatus')}</span>
            <select
              value={productFacts.testedStatus.value}
              onChange={(event) =>
                setTestedStatus(event.target.value as 'tested' | 'untested' | 'unknown')
              }
            >
              <option value="tested">{t('tested')}</option>
              <option value="untested">{t('untested')}</option>
              <option value="unknown">{t('unknown')}</option>
            </select>
          </label>
          <p>
            {t('confidence')}: {Math.round(fingerprint.confidence * 100)}%
          </p>
        </div>
      )}
    </SectionCard>
  );
}
