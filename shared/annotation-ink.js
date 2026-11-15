const namespace = 'http://www.w3.org/2000/svg';
export function validInk(ink) {
  if (ink === undefined) return true;
  if (!ink || ink.version !== 1 || ink.width !== 800 ||
      !Number.isFinite(ink.height) || ink.height < 80 || ink.height > 12000 ||
      !Array.isArray(ink.strokes) || ink.strokes.length > 2000) return false;
  if (ink.strokeWidths !== undefined && (!Array.isArray(ink.strokeWidths) || ink.strokeWidths.length !== ink.strokes.length || !ink.strokeWidths.every(w => Number.isFinite(w) && w >= 1 && w <= 12))) return false;
  let points = 0;
  return ink.strokes.every(stroke => Array.isArray(stroke) && stroke.length > 0 &&
    (points += stroke.length) <= 24000 && stroke.every(p => Array.isArray(p) && (p.length === 2 || (p.length === 3 && Number.isFinite(p[2]) && p[2] >= 0 && p[2] <= 1)) &&
      Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[0] >= 0 && p[0] <= 800 && p[1] >= 0 && p[1] <= ink.height));
}
export function inkSvg(ink) {
  const svg = document.createElementNS(namespace, 'svg');
  svg.classList.add('annotation-ink');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Handwritten annotation');
  svg.setAttribute('viewBox', '0 0 800 ' + (ink?.height || 260));
  if (!ink || !validInk(ink)) return svg;
  ink.strokes.forEach((stroke,i) => appendStroke(svg, stroke, ink.strokeWidths?.[i] ?? 2.5));
  return svg;
}
export function pressureWidth(width, pressure=.5){return width*(.8+.4*pressure);}
export function paintStroke(line,points,width=2.5){
 if(line.tagName.toLowerCase()==='polyline'){
  const drawn=points.length===1?[points[0],[points[0][0]+.1,points[0][1]]]:points;
  line.setAttribute('points',drawn.map(p=>p.slice(0,2).join(',')).join(' '));return;
 }
 // One SVG path per stroke: rounded segment outlines, shared by Reader and PC.
 let d='';const radius=p=>pressureWidth(width,p[2]??.5)/2;
 for(let i=0;i<points.length;i++){
  const p=points[i],r=radius(p),x=p[0],y=p[1];
  d+=`M${x-r},${y}a${r},${r} 0 1,0 ${2*r},0a${r},${r} 0 1,0 ${-2*r},0Z`;
  if(!i)continue;const a=points[i-1],ar=radius(a),dx=x-a[0],dy=y-a[1],len=Math.hypot(dx,dy);if(!len)continue;
  const nx=-dy/len,ny=dx/len;
  d+=`M${a[0]+nx*ar},${a[1]+ny*ar}L${x+nx*r},${y+ny*r}L${x-nx*r},${y-ny*r}L${a[0]-nx*ar},${a[1]-ny*ar}Z`;
 }
 line.setAttribute('d',d);
}
export function appendStroke(svg,points,width=2.5){
 const pressure=points.some(p=>p.length===3),line=document.createElementNS(namespace,pressure?'path':'polyline');
 line.classList.add('ink-stroke');line.setAttribute('fill',pressure?'#31483b':'none');line.setAttribute('stroke',pressure?'none':'#31483b');
 line.setAttribute('stroke-width',String(width));line.setAttribute('stroke-linecap','round');line.setAttribute('stroke-linejoin','round');
 paintStroke(line,points,width);svg.append(line);return line;
}
