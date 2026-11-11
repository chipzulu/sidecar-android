const namespace = 'http://www.w3.org/2000/svg';
export function validInk(ink) {
  if (ink === undefined) return true;
  if (!ink || ink.version !== 1 || ink.width !== 800 ||
      !Number.isFinite(ink.height) || ink.height < 80 || ink.height > 12000 ||
      !Array.isArray(ink.strokes) || ink.strokes.length > 2000) return false;
  let points = 0;
  return ink.strokes.every(stroke => Array.isArray(stroke) && stroke.length > 0 &&
    (points += stroke.length) <= 24000 && stroke.every(p => Array.isArray(p) && p.length === 2 &&
      Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[0] >= 0 && p[0] <= 800 && p[1] >= 0 && p[1] <= ink.height));
}
export function inkSvg(ink) {
  const svg = document.createElementNS(namespace, 'svg');
  svg.classList.add('annotation-ink');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Handwritten annotation');
  svg.setAttribute('viewBox', '0 0 800 ' + (ink?.height || 260));
  if (!ink || !validInk(ink)) return svg;
  for (const stroke of ink.strokes) appendStroke(svg, stroke);
  return svg;
}
export function appendStroke(svg, points) {
  const line = document.createElementNS(namespace, 'polyline');
  const drawn = points.length === 1 ? [points[0], [points[0][0] + .1, points[0][1]]] : points;
  line.setAttribute('points', drawn.map(p => p.join(',')).join(' '));
  line.setAttribute('fill', 'none');
  line.setAttribute('stroke', '#31483b');
  line.setAttribute('stroke-width', '2.5');
  line.setAttribute('stroke-linecap', 'round');
  line.setAttribute('stroke-linejoin', 'round');
  svg.append(line);
  return line;
}
