import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { layoutTrendBubbles } from '../../src/features/trends/layout';
import type { TrendAggregates } from '../../src/domain/types';
for (const year of [2024, 2025])
  it(`keeps ${year} bubble layout deterministic and within the visible bounds`, () => {
    const data = JSON.parse(
      readFileSync(`public/generated/trend-aggregates-${year}.json`, 'utf8'),
    ) as TrendAggregates;
    const nodes = layoutTrendBubbles(data.themes, () => 40);
    expect(nodes).toEqual(layoutTrendBubbles(data.themes, () => 40));
    expect(nodes.map((n) => n.trend_theme_id)).toEqual(data.themes.map((n) => n.trend_theme_id));
    for (const n of nodes) {
      expect(n.bubblePosition.x - n.bubbleRadius).toBeGreaterThanOrEqual(95.99);
      expect(n.bubblePosition.x + n.bubbleRadius).toBeLessThanOrEqual(904.01);
      expect(n.bubblePosition.y - n.bubbleRadius).toBeGreaterThanOrEqual(95.99);
      expect(n.bubblePosition.y + n.bubbleRadius).toBeLessThanOrEqual(624.01);
    }
  });
