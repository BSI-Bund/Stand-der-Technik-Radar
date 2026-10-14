import type { TaxonomyNode } from '../../domain/types';
export type ChartNode = TaxonomyNode & { valueForLayout?: number };
export type LabelState = {
  state: 'visible' | 'hidden';
  lines: string[];
  fontSize: number;
  lineHeight: number;
  x: number;
  y: number;
  rotate: number;
  truncated: boolean;
  orientation: 'tangential' | 'radial';
  hiddenReason?: string;
};

type LabelCandidate = {
  lines: string[];
  fontSize: number;
  lineHeight: number;
  truncated: boolean;
  orientation: 'tangential' | 'radial';
};

export type LabelContext = {
  svg: SVGSVGElement;
  canvas: CanvasRenderingContext2D;
  fontFamily: string;
  fontWeight: string;
  visualPadding: number;
};

export const tau = Math.PI * 2;
const minLabelFontSize = 8;
const maxLabelFontSize = 14;

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .trim();
}

export function mixWithWhite(hex: string, amount: number): string {
  const normalized = hex.trim().replace('#', '');
  const rgbMatch = hex.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/i);
  if (!/^[0-9a-f]{6}$/i.test(normalized) && !rgbMatch) return hex;
  const value = rgbMatch ? 0 : Number.parseInt(normalized, 16);
  const r = rgbMatch ? Number(rgbMatch[1]) : (value >> 16) & 255;
  const g = rgbMatch ? Number(rgbMatch[2]) : (value >> 8) & 255;
  const b = rgbMatch ? Number(rgbMatch[3]) : value & 255;
  const mix = (channel: number) => Math.round(channel + (255 - channel) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

export function fillForNode(node: { depth: number; data: TaxonomyNode }): string {
  const base = node.data.color ?? '#64748b';
  if ((node.data.kind === 'product_group' || node.data.level >= 3) && node.data.counts.total === 0)
    return mixWithWhite(base, 0.76);
  if (node.depth === 1) return mixWithWhite(base, 0.48);
  if (node.depth === 2) return mixWithWhite(base, 0.32);
  return mixWithWhite(base, 0.16);
}

export function withLayoutValue(node: TaxonomyNode): ChartNode {
  return {
    ...node,
    valueForLayout: node.children?.length
      ? undefined
      : (node.display_weight ?? Math.max(0.36, node.counts.total)),
    children: node.children?.map(withLayoutValue),
  };
}

function fontSizes(): number[] {
  const sizes = [];
  for (let size = maxLabelFontSize; size >= minLabelFontSize; size -= 0.5) {
    sizes.push(size);
  }
  return sizes;
}

function setMeasureFont(context: LabelContext, fontSize: number) {
  context.canvas.font = `${context.fontWeight} ${fontSize}px ${context.fontFamily}`;
}

function measureCandidate(
  context: LabelContext,
  candidate: LabelCandidate,
): { width: number; height: number } {
  setMeasureFont(context, candidate.fontSize);
  const width = Math.max(...candidate.lines.map((line) => context.canvas.measureText(line).width));
  return { width, height: candidate.lines.length * candidate.lineHeight };
}

function twoLineSplits(text: string): string[][] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return [];
  return words
    .slice(1)
    .map((_, index) => {
      const split = index + 1;
      return [words.slice(0, split).join(' '), words.slice(split).join(' ')];
    })
    .sort((a, b) => Math.abs(a[0].length - a[1].length) - Math.abs(b[0].length - b[1].length));
}

function graphemes(text: string): string[] {
  const Segmenter = Intl.Segmenter;
  if (Segmenter) {
    const segmenter = new Segmenter('de', { granularity: 'grapheme' });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return Array.from(text);
}

function readableRotation(degrees: number): number {
  let rotation = ((degrees + 180) % 360) - 180;
  if (rotation > 90) rotation -= 180;
  if (rotation < -90) rotation += 180;
  return rotation;
}

function labelTransform(
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
  orientation: LabelCandidate['orientation'],
) {
  const midAngle = (startAngle + endAngle) / 2;
  const rMid = (innerRadius + outerRadius) / 2;
  const x = Math.sin(midAngle) * rMid;
  const y = -Math.cos(midAngle) * rMid;
  const midDegrees = (midAngle * 180) / Math.PI;
  const rotate = readableRotation(orientation === 'tangential' ? midDegrees : midDegrees - 90);
  return { x, y, rotate };
}

function precheckCandidate(
  node: { x0: number; x1: number; y0: number; y1: number },
  candidate: LabelCandidate,
  context: LabelContext,
): { ok: true } | { ok: false; reason: string } {
  const visualPadding = context.visualPadding;
  const metrics = measureCandidate(context, candidate);
  const ringWidth = node.y1 - node.y0;
  const rMid = (node.y0 + node.y1) / 2;
  const safeRadius = rMid - metrics.height / 2 - visualPadding;
  const availableTangential = safeRadius * (node.x1 - node.x0) - 2 * visualPadding;

  if (candidate.orientation === 'tangential') {
    const availableRadial = ringWidth - 2 * visualPadding;
    if (metrics.height > availableRadial) return { ok: false, reason: 'insufficient-ring-height' };
    if (safeRadius <= node.y0 + visualPadding)
      return { ok: false, reason: 'insufficient-ring-height' };
    if (metrics.width > availableTangential) return { ok: false, reason: 'insufficient-arc-width' };
    return { ok: true };
  }

  const availableRadialForTextLength = ringWidth - 2 * visualPadding;
  const availableTangentialForTextHeight = rMid * (node.x1 - node.x0) - 2 * visualPadding;
  if (metrics.width > availableRadialForTextLength)
    return { ok: false, reason: 'insufficient-ring-height' };
  if (metrics.height > availableTangentialForTextHeight)
    return { ok: false, reason: 'insufficient-arc-width' };

  return { ok: true };
}

function normalizeAngleNear(angle: number, reference: number): number {
  let normalized = angle;
  while (normalized - reference > Math.PI) normalized -= tau;
  while (normalized - reference < -Math.PI) normalized += tau;
  return normalized;
}

function renderProbeText(
  context: LabelContext,
  node: { x0: number; x1: number; y0: number; y1: number },
  candidate: LabelCandidate,
): SVGTextElement {
  const ns = 'http://www.w3.org/2000/svg';
  const text = document.createElementNS(ns, 'text');
  const transform = labelTransform(node.x0, node.x1, node.y0, node.y1, candidate.orientation);
  text.setAttribute('class', 'slice-label label-probe');
  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'middle');
  text.setAttribute(
    'transform',
    `translate(${transform.x},${transform.y}) rotate(${transform.rotate})`,
  );
  text.style.fontSize = `${candidate.fontSize}px`;
  text.style.opacity = '0';
  text.style.pointerEvents = 'none';
  candidate.lines.forEach((line, index) => {
    const tspan = document.createElementNS(ns, 'tspan');
    tspan.setAttribute('x', '0');
    tspan.setAttribute('y', `${(index - (candidate.lines.length - 1) / 2) * candidate.lineHeight}`);
    tspan.textContent = line;
    text.appendChild(tspan);
  });
  context.svg.appendChild(text);
  return text;
}

function finalContainmentCheck(
  context: LabelContext,
  node: { x0: number; x1: number; y0: number; y1: number },
  candidate: LabelCandidate,
): boolean {
  const probe = renderProbeText(context, node, candidate);
  try {
    const box = probe.getBBox();
    const transform = labelTransform(node.x0, node.x1, node.y0, node.y1, candidate.orientation);
    const rotate = (transform.rotate * Math.PI) / 180;
    const cos = Math.cos(rotate);
    const sin = Math.sin(rotate);
    const midAngle = (node.x0 + node.x1) / 2;
    const angularPadding = Math.max(
      0.004,
      context.visualPadding / Math.max(1, (node.y0 + node.y1) / 2),
    );
    const corners = [
      { x: box.x, y: box.y },
      { x: box.x + box.width, y: box.y },
      { x: box.x, y: box.y + box.height },
      { x: box.x + box.width, y: box.y + box.height },
    ].map((point) => ({
      x: point.x * cos - point.y * sin + transform.x,
      y: point.x * sin + point.y * cos + transform.y,
    }));

    return corners.every((point) => {
      const radius = Math.hypot(point.x, point.y);
      let angle = Math.atan2(point.x, -point.y);
      if (angle < 0) angle += tau;
      angle = normalizeAngleNear(angle, midAngle);
      return (
        radius >= node.y0 + context.visualPadding &&
        radius <= node.y1 - context.visualPadding &&
        angle >= node.x0 + angularPadding &&
        angle <= node.x1 - angularPadding
      );
    });
  } finally {
    probe.remove();
  }
}

function candidateFits(
  node: { x0: number; x1: number; y0: number; y1: number },
  candidate: LabelCandidate,
  context: LabelContext,
): { ok: true } | { ok: false; reason: string } {
  const precheck = precheckCandidate(node, candidate, context);
  if (!precheck.ok) return precheck;
  if (!finalContainmentCheck(context, node, candidate)) {
    return { ok: false, reason: 'failed-final-containment-check' };
  }
  return { ok: true };
}

export function layoutSunburstLabel(
  node: { x0: number; x1: number; y0: number; y1: number },
  labelText: string,
  context: LabelContext,
): LabelState {
  const fallbackTransform = labelTransform(node.x0, node.x1, node.y0, node.y1, 'tangential');
  let lastReason = 'failed-final-containment-check';

  for (const fontSize of fontSizes()) {
    for (const orientation of ['tangential', 'radial'] as const) {
      const candidate = {
        lines: [labelText],
        fontSize,
        lineHeight: fontSize * 1.18,
        truncated: false,
        orientation,
      };
      const result = candidateFits(node, candidate, context);
      if (result.ok)
        return {
          state: 'visible',
          ...candidate,
          ...labelTransform(node.x0, node.x1, node.y0, node.y1, orientation),
        };
      lastReason = result.reason;
    }
  }

  for (const fontSize of fontSizes()) {
    for (const lines of twoLineSplits(labelText)) {
      for (const orientation of ['tangential', 'radial'] as const) {
        const candidate = {
          lines,
          fontSize,
          lineHeight: fontSize * 1.18,
          truncated: false,
          orientation,
        };
        const result = candidateFits(node, candidate, context);
        if (result.ok)
          return {
            state: 'visible',
            ...candidate,
            ...labelTransform(node.x0, node.x1, node.y0, node.y1, orientation),
          };
        lastReason = result.reason;
      }
    }
  }

  const parts = graphemes(labelText.trim());
  let bestTruncated: {
    candidate: LabelCandidate;
    keptLength: number;
  } | null = null;
  for (const fontSize of fontSizes()) {
    for (const orientation of ['tangential', 'radial'] as const) {
      let low = 0;
      let high = parts.length;
      let localBest: {
        candidate: LabelCandidate;
        keptLength: number;
      } | null = null;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const visible = `${parts.slice(0, mid).join('').trimEnd()}...`;
        const candidate = {
          lines: [visible],
          fontSize,
          lineHeight: fontSize * 1.18,
          truncated: true,
          orientation,
        };
        const result = candidateFits(node, candidate, context);
        if (result.ok) {
          localBest = { candidate, keptLength: mid };
          low = mid + 1;
        } else {
          lastReason = result.reason;
          high = mid - 1;
        }
      }
      if (
        localBest &&
        (!bestTruncated ||
          localBest.keptLength > bestTruncated.keptLength ||
          (localBest.keptLength === bestTruncated.keptLength &&
            localBest.candidate.fontSize > bestTruncated.candidate.fontSize) ||
          (localBest.keptLength === bestTruncated.keptLength &&
            localBest.candidate.fontSize === bestTruncated.candidate.fontSize &&
            bestTruncated.candidate.orientation !== 'tangential' &&
            localBest.candidate.orientation === 'tangential'))
      ) {
        bestTruncated = localBest;
      }
    }
  }
  if (bestTruncated) {
    return {
      state: 'visible',
      ...bestTruncated.candidate,
      ...labelTransform(node.x0, node.x1, node.y0, node.y1, bestTruncated.candidate.orientation),
    };
  }

  if (
    lastReason !== 'insufficient-ring-height' &&
    lastReason !== 'failed-final-containment-check'
  ) {
    lastReason = 'ellipsis-does-not-fit';
  }
  return {
    state: 'hidden',
    lines: [],
    fontSize: minLabelFontSize,
    lineHeight: minLabelFontSize * 1.18,
    orientation: 'tangential',
    truncated: false,
    hiddenReason: lastReason,
    ...fallbackTransform,
  };
}
