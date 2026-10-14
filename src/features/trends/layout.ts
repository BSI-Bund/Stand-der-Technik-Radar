import type { TrendThemeAggregate } from '../../domain/types';
type PositionedTrendTheme = TrendThemeAggregate & {
  bubbleColor: string;
  bubbleRadius: number;
  bubblePosition: {
    x: number;
    y: number;
  };
};

const trendPalette = [
  '#5f7ff5',
  '#b293ee',
  '#e7a951',
  '#57c6c3',
  '#f1797d',
  '#4c78d8',
  '#9b7ae6',
  '#df8a00',
  '#35aaa6',
  '#ef6461',
];
export const trendViewBox = { width: 1000, height: 720 };
const trendBubbleBounds = { left: 96, right: 904, top: 96, bottom: 624 };
const trendBubbleGap = 14;
function splitLabel(label: string): string[] {
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return [label];
  const midpoint = Math.ceil(words.length / 2);
  return [words.slice(0, midpoint).join(' '), words.slice(midpoint).join(' ')];
}

export function bubbleLabelLines(label: string, radius: number): string[] {
  const maxChars = Math.max(5, Math.floor((radius * 1.55) / 6));
  return splitLabel(label)
    .slice(0, 2)
    .map((line) => {
      if (line.length <= maxChars) return line;
      return `${line.slice(0, Math.max(2, maxChars - 3)).trimEnd()}...`;
    });
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function layoutTrendBubbles(
  themes: TrendThemeAggregate[],
  radiusForTheme: (theme: TrendThemeAggregate) => number,
): PositionedTrendTheme[] {
  if (!themes.length) return [];

  const rawNodes = themes.map((theme, index) => {
    const r = radiusForTheme(theme);
    return {
      theme,
      index,
      r,
      rawX: theme.map_position.x,
      rawY: theme.map_position.y,
      x: theme.map_position.x,
      y: theme.map_position.y,
      targetX: theme.map_position.x,
      targetY: theme.map_position.y,
    };
  });

  const rawLeft = Math.min(...rawNodes.map((node) => node.rawX - node.r));
  const rawRight = Math.max(...rawNodes.map((node) => node.rawX + node.r));
  const rawTop = Math.min(...rawNodes.map((node) => node.rawY - node.r));
  const rawBottom = Math.max(...rawNodes.map((node) => node.rawY + node.r));
  const rawWidth = Math.max(1, rawRight - rawLeft);
  const rawHeight = Math.max(1, rawBottom - rawTop);
  const targetWidth = trendBubbleBounds.right - trendBubbleBounds.left;
  const targetHeight = trendBubbleBounds.bottom - trendBubbleBounds.top;
  const fitScale = Math.min(targetWidth / rawWidth, targetHeight / rawHeight, 1.08);
  const rawCenterX = (rawLeft + rawRight) / 2;
  const rawCenterY = (rawTop + rawBottom) / 2;
  const targetCenterX = (trendBubbleBounds.left + trendBubbleBounds.right) / 2;
  const targetCenterY = (trendBubbleBounds.top + trendBubbleBounds.bottom) / 2;

  rawNodes.forEach((node) => {
    node.targetX = targetCenterX + (node.rawX - rawCenterX) * fitScale;
    node.targetY = targetCenterY + (node.rawY - rawCenterY) * fitScale;
    node.x = clamp(node.targetX, trendBubbleBounds.left + node.r, trendBubbleBounds.right - node.r);
    node.y = clamp(node.targetY, trendBubbleBounds.top + node.r, trendBubbleBounds.bottom - node.r);
  });

  const nodes = [...rawNodes].sort((a, b) => b.r - a.r || a.index - b.index);

  for (let iteration = 0; iteration < 240; iteration += 1) {
    let largestMove = 0;

    nodes.forEach((node) => {
      node.x += (node.targetX - node.x) * 0.012;
      node.y += (node.targetY - node.y) * 0.012;
      node.x = clamp(node.x, trendBubbleBounds.left + node.r, trendBubbleBounds.right - node.r);
      node.y = clamp(node.y, trendBubbleBounds.top + node.r, trendBubbleBounds.bottom - node.r);
    });

    for (let i = 0; i < nodes.length; i += 1) {
      for (let j = i + 1; j < nodes.length; j += 1) {
        const a = nodes[i];
        const b = nodes[j];
        const minDistance = a.r + b.r + trendBubbleGap;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let distance = Math.hypot(dx, dy);

        if (distance < 0.001) {
          const angle = ((a.index + 1) * 37 + (b.index + 1) * 17) * (Math.PI / 180);
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }

        if (distance >= minDistance) continue;

        const overlap = minDistance - distance;
        const nx = dx / distance;
        const ny = dy / distance;
        const aWeight = b.r / (a.r + b.r);
        const bWeight = a.r / (a.r + b.r);
        const aMove = overlap * aWeight;
        const bMove = overlap * bWeight;

        a.x -= nx * aMove;
        a.y -= ny * aMove;
        b.x += nx * bMove;
        b.y += ny * bMove;

        a.x = clamp(a.x, trendBubbleBounds.left + a.r, trendBubbleBounds.right - a.r);
        a.y = clamp(a.y, trendBubbleBounds.top + a.r, trendBubbleBounds.bottom - a.r);
        b.x = clamp(b.x, trendBubbleBounds.left + b.r, trendBubbleBounds.right - b.r);
        b.y = clamp(b.y, trendBubbleBounds.top + b.r, trendBubbleBounds.bottom - b.r);
        largestMove = Math.max(largestMove, overlap);
      }
    }

    if (largestMove < 0.05) break;
  }

  return rawNodes
    .sort((a, b) => a.index - b.index)
    .map((node) => ({
      ...node.theme,
      bubbleColor: trendPalette[node.index % trendPalette.length],
      bubbleRadius: node.r,
      bubblePosition: {
        x: Number(node.x.toFixed(2)),
        y: Number(node.y.toFixed(2)),
      },
    }));
}

export function totalForTheme(theme: TrendThemeAggregate): number {
  return theme.counts.items_total ?? theme.counts.requirements_total ?? 0;
}
