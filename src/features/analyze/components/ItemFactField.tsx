import type { FactSource } from '@core/types';
import { FactProvenance } from './FactProvenance';

interface ItemFactFieldProps {
  id: string;
  label: string;
  value: string;
  source?: FactSource;
  locked?: boolean;
  onCommit: (value: string) => void;
  onLock?: (locked: boolean) => void;
}

export function ItemFactField({
  id,
  label,
  value,
  source,
  locked,
  onCommit,
  onLock,
}: ItemFactFieldProps) {
  return (
    <div className="review-fact" id={id}>
      <label className="field">
        <span>{label}</span>
        <input
          key={`${id}-${value}`}
          defaultValue={value}
          onBlur={(event) => onCommit(event.target.value)}
        />
      </label>
      <FactProvenance source={source} locked={locked} onLock={onLock} />
    </div>
  );
}
