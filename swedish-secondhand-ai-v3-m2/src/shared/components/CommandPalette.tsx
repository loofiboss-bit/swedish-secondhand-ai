import { useEffect, useMemo, useRef, useState } from 'react';

interface CommandPaletteAction {
  id: string;
  label: string;
  run: () => void | Promise<void>;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  actions: CommandPaletteAction[];
}

export function CommandPalette({ open, onClose, actions }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const timer = window.setTimeout(() => {
      setQuery('');
      inputRef.current?.focus();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [open]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return actions;
    return actions.filter((action) => action.label.toLowerCase().includes(normalized));
  }, [actions, query]);

  if (!open) return null;

  return (
    <div className="command-palette__overlay" onClick={onClose} role="presentation">
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type a command..."
          aria-label="Command search"
        />
        <ul>
          {filtered.map((action) => (
            <li key={action.id}>
              <button
                type="button"
                onClick={() => {
                  void action.run();
                  onClose();
                }}
              >
                {action.label}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="command-empty">No command found.</li>}
        </ul>
      </div>
    </div>
  );
}
