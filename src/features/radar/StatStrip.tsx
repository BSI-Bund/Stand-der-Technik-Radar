import type { TaxonomyMapData } from '../../domain/types';

export function StatStrip({ data }: { data: TaxonomyMapData }) {
  const topicsWithMatches = new Set(data.mappings.map((mapping) => mapping.taxonomy.leaf_id)).size;
  const stats = [
    {
      label: 'Controls im Radar',
      value: data.stats.mapped_controls,
      detail: 'Anforderungen und Maßnahmen',
    },
    {
      label: 'Components im Radar',
      value: data.stats.mapped_components,
      detail: 'Beschriebene Umsetzungen',
    },
    {
      label: 'Themen mit Treffern',
      value: topicsWithMatches,
      detail: 'Produkt- und Servicegruppen',
    },
  ];
  return (
    <section aria-label="Inhalte im Radar">
      <div className="stat-strip">
        {stats.map(({ label, value, detail }) => (
          <article className="stat" key={label}>
            <div>{label}</div>
            <strong>{value.toLocaleString('de-DE')}</strong>
            <p>{detail}</p>
          </article>
        ))}
      </div>
      <p className="stat-note">Ein Control kann in mehreren Katalogen als Treffer erscheinen.</p>
    </section>
  );
}
