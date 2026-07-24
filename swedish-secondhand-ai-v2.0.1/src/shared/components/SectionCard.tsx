import type { PropsWithChildren, ReactNode } from 'react';

interface SectionCardProps extends PropsWithChildren {
  title: ReactNode;
  action?: ReactNode;
}

export function SectionCard({ title, action, children }: SectionCardProps) {
  return (
    <section className="section-card">
      <header className="section-card__header">
        <h2>{title}</h2>
        {action}
      </header>
      <div className="section-card__body">{children}</div>
    </section>
  );
}
