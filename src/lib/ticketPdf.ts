import QRCode from 'qrcode';
import { PDFDocument, rgb } from 'pdf-lib';
import { EVENT, eventWhen, eventWhere } from '../event.config';

const W = 1500;
const H = 2500;
const SIDE = 90;
const PAGE_W = 432;
const PAGE_H = 720;
const POINTS_PER_PIXEL = PAGE_W / W;

const NIGHT = '#0a1330';
const CREAM = '#fff6e8';
const GOLD = '#ffd27a';
const INK = '#14275c';
const TEAR_Y = 1560;
const QR_SIZE = 600;
const QR_TOP = 1655;
const FLAME_BASE = 1120;

type Ctx = CanvasRenderingContext2D;
type Random = () => number;

/** Generador repetible: el mismo ticket siempre sale con las mismas llamas. */
function seededRandom(text: string): Random {
  let seed = 2166136261;
  for (const char of text) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar el logo'));
    image.src = src;
  });
}

function fitFont(ctx: Ctx, text: string, font: (size: number) => string, start: number, min: number, maxWidth: number) {
  let size = start;
  ctx.font = font(size);
  while (ctx.measureText(text).width > maxWidth && size > min) {
    size -= 2;
    ctx.font = font(size);
  }
}

const anton = (size: number) => `${size}px Anton`;
const manrope = (weight: number) => (size: number) => `${weight} ${size}px "Manrope Variable"`;

function paintRays(ctx: Ctx) {
  const cx = W * 0.5;
  const cy = 640;
  const rays = 44;
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < rays; i++) {
    if (i % 2) continue;
    const from = (i / rays) * Math.PI * 2;
    const to = ((i + 1) / rays) * Math.PI * 2;
    const reach = 1900;
    const gradient = ctx.createRadialGradient(0, 0, 80, 0, 0, reach);
    gradient.addColorStop(0, 'rgba(255,210,122,0.20)');
    gradient.addColorStop(1, 'rgba(255,210,122,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(from) * reach, Math.sin(from) * reach);
    ctx.lineTo(Math.cos(to) * reach, Math.sin(to) * reach);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function tongue(ctx: Ctx, x: number, y: number, height: number, width: number, lean: number, colors: [string, string, string]) {
  const gradient = ctx.createLinearGradient(0, y - height, 0, y);
  gradient.addColorStop(0, colors[0]);
  gradient.addColorStop(0.55, colors[1]);
  gradient.addColorStop(1, colors[2]);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y);
  ctx.bezierCurveTo(x - width * 1.2, y - height * 0.38, x + lean * 0.05 - width * 0.3, y - height * 0.66, x + lean, y - height);
  ctx.bezierCurveTo(x + lean * 0.5 + width * 0.62, y - height * 0.62, x + width * 0.3 - lean * 0.2, y - height * 0.32, x + width * 0.52, y);
  ctx.closePath();
  ctx.fill();
}

function paintFlames(ctx: Ctx, random: Random) {
  ctx.save();
  const layers: Array<{ count: number; height: [number, number]; width: [number, number]; colors: [string, string, string] }> = [
    { count: 9, height: [640, 900], width: [230, 340], colors: ['#7d1a12', '#5e1420', '#2a1230'] },
    { count: 10, height: [430, 660], width: [170, 260], colors: ['#c2360c', '#8f2410', '#3a1228'] },
    { count: 11, height: [250, 430], width: [120, 190], colors: ['#ff7a1f', '#d4480c', '#5a1a1c'] },
    { count: 11, height: [120, 250], width: [80, 130], colors: ['#ffd27a', '#ff8a2a', '#a8320c'] },
  ];
  for (const layer of layers) {
    for (let i = 0; i < layer.count; i++) {
      const slot = (i + 0.5) / layer.count;
      const x = -80 + (W + 160) * slot + (random() - 0.5) * 110;
      // Más altas a los lados: el centro queda oscuro para que se lea el título
      const edge = 0.55 + 0.65 * Math.abs(2 * slot - 1) ** 1.4;
      const height = (layer.height[0] + random() * (layer.height[1] - layer.height[0])) * edge;
      const width = layer.width[0] + random() * (layer.width[1] - layer.width[0]);
      const lean = (random() - 0.5) * height * 0.5;
      tongue(ctx, x, FLAME_BASE, height, width, lean, layer.colors);
    }
  }
  ctx.restore();
}

function paintEmbers(ctx: Ctx, random: Random) {
  ctx.save();
  for (let i = 0; i < 190; i++) {
    const radius = 1.5 + random() ** 3 * 8;
    const x = random() * W;
    const y = 40 + random() * 1000;
    const alpha = 0.4 + random() * 0.6;
    ctx.fillStyle = random() > 0.45 ? GOLD : '#ff9a3d';
    ctx.globalAlpha = alpha * 0.25;
    ctx.beginPath();
    ctx.arc(x, y, radius * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function paintHeader(ctx: Ctx, logo: HTMLImageElement) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(SIDE + 88, 170, 88, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(SIDE + 88, 170, 88, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(logo, SIDE, 82, 176, 176);
  ctx.restore();

  ctx.fillStyle = '#fff';
  ctx.font = manrope(800)(44);
  ctx.fillText(EVENT.organizer, SIDE + 206, 162);
  ctx.fillStyle = GOLD;
  ctx.font = manrope(700)(34);
  ctx.fillText('presenta', SIDE + 206, 210);

  ctx.save();
  ctx.translate(W - SIDE - 150, 172);
  ctx.rotate(-0.13);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.roundRect(-150, -66, 300, 132, 20);
  ctx.stroke();
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.roundRect(-136, -52, 272, 104, 12);
  ctx.stroke();
  ctx.fillStyle = GOLD;
  ctx.textAlign = 'center';
  ctx.font = manrope(800)(28);
  ctx.fillText('ENTRADA', 0, -8);
  ctx.font = anton(46);
  ctx.fillText('GRATUITA', 0, 42);
  ctx.restore();
}

function sizeToWidth(ctx: Ctx, text: string, width: number) {
  ctx.font = anton(100);
  return (100 * width) / ctx.measureText(text).width;
}

function paintTitle(ctx: Ctx) {
  const center = W / 2;
  const baseline = 1050;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';

  ctx.font = anton(sizeToWidth(ctx, 'CIERRE DE', 1120));
  ctx.strokeStyle = NIGHT;
  ctx.lineWidth = 20;
  ctx.strokeText('CIERRE DE', center, 566);
  ctx.fillStyle = CREAM;
  ctx.fillText('CIERRE DE', center, 566);

  ctx.font = anton(sizeToWidth(ctx, 'GLORIA', W - SIDE * 2));
  ctx.strokeStyle = NIGHT;
  ctx.lineWidth = 34;
  ctx.strokeText('GLORIA', center, baseline + 26);
  ctx.fillStyle = '#b02e00';
  ctx.fillText('GLORIA', center, baseline + 26);
  ctx.fillStyle = '#7a1c00';
  ctx.fillText('GLORIA', center, baseline + 14);

  const fire = ctx.createLinearGradient(0, baseline - 450, 0, baseline);
  fire.addColorStop(0, '#fff6d0');
  fire.addColorStop(0.5, '#ffcf5e');
  fire.addColorStop(1, '#ff8420');
  ctx.fillStyle = fire;
  ctx.fillText('GLORIA', center, baseline);
  ctx.restore();
}

function nameLines(ctx: Ctx, name: string, maxWidth: number) {
  const fits = (lines: string[], size: number) => {
    ctx.font = anton(size);
    return lines.every(line => ctx.measureText(line).width <= maxWidth);
  };
  for (let size = 180; size >= 130; size -= 4) {
    if (fits([name], size)) return [name];
  }
  const spaces = [...name.matchAll(/ /g)].map(match => match.index ?? 0);
  const middle = spaces.reduce((best, index) => Math.abs(index - name.length / 2) < Math.abs(best - name.length / 2) ? index : best, spaces[0] ?? name.length);
  const lines = [name.slice(0, middle), name.slice(middle + 1)].filter(Boolean);
  let size = 112;
  while (!fits(lines, size) && size > 40) size -= 2;
  return lines;
}

function paintGuest(ctx: Ctx, fullName: string) {
  const width = W - SIDE * 2;
  ctx.fillStyle = GOLD;
  ctx.font = manrope(800)(36);
  ctx.fillText('ENTRADA A NOMBRE DE', SIDE, 1172);

  const name = fullName.toUpperCase();
  const lines = nameLines(ctx, name, width);
  ctx.fillStyle = '#fff';
  if (lines.length === 1) {
    ctx.fillText(lines[0], SIDE, 1352);
  } else {
    ctx.fillText(lines[0], SIDE, 1284);
    ctx.fillText(lines[1], SIDE, 1392);
  }

  const column = (W - SIDE * 2 - 40) / 2;
  const facts: Array<[string, string, number]> = [['CUÁNDO', eventWhen(), SIDE], ['DÓNDE', eventWhere(), SIDE + column + 40]];
  for (const [label, value, x] of facts) {
    ctx.fillStyle = GOLD;
    ctx.font = manrope(800)(26);
    ctx.fillText(label, x, 1454);
    ctx.fillStyle = '#fff';
    fitFont(ctx, value, manrope(700), 40, 22, column);
    ctx.fillText(value, x, 1504);
  }
}

function paintStub(ctx: Ctx, ticketCode: string) {
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, TEAR_Y, W, H - TEAR_Y);

  const strip = ctx.createLinearGradient(0, 0, W, 0);
  strip.addColorStop(0, '#ffd27a');
  strip.addColorStop(0.5, '#ff7a1f');
  strip.addColorStop(1, '#ffd27a');
  ctx.fillStyle = strip;
  ctx.fillRect(0, TEAR_Y - 12, W, 12);

  ctx.setLineDash([26, 22]);
  ctx.strokeStyle = 'rgba(20,39,92,0.4)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(90, TEAR_Y + 36);
  ctx.lineTo(W - 90, TEAR_Y + 36);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = NIGHT;
  for (const x of [0, W]) {
    ctx.beginPath();
    ctx.arc(x, TEAR_Y + 36, 52, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.save();
  ctx.font = anton(84);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(232,95,12,0.26)';
  for (const [x, angle] of [[190, -Math.PI / 2], [W - 190, Math.PI / 2]] as const) {
    ctx.save();
    ctx.translate(x, QR_TOP + QR_SIZE / 2);
    ctx.rotate(angle);
    ctx.fillText('CIERRE DE GLORIA', 0, 28);
    ctx.restore();
  }
  ctx.restore();

  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.roundRect((W - QR_SIZE) / 2 - 44, QR_TOP - 44, QR_SIZE + 88, QR_SIZE + 88, 36);
  ctx.fill();

  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = anton(64);
  ctx.fillText(ticketCode, W / 2, QR_TOP + QR_SIZE + 124);
  ctx.font = manrope(700)(30);
  ctx.fillStyle = '#4b5878';
  ctx.fillText('Muestra este código en la entrada. Es personal y solo sirve una vez.', W / 2, QR_TOP + QR_SIZE + 176);
  ctx.textAlign = 'left';
}

/** Dibuja el QR como una sola figura vectorial, para que salga nítido en pantalla e impreso. */
function qrPath(text: string) {
  const { size, get } = (() => {
    const { modules } = QRCode.create(text, { errorCorrectionLevel: 'M' });
    return { size: modules.size, get: (row: number, col: number) => Boolean(modules.get(row, col)) };
  })();

  let path = '';
  for (let row = 0; row < size; row++) {
    let col = 0;
    while (col < size) {
      if (!get(row, col)) {
        col++;
        continue;
      }
      let run = 1;
      while (col + run < size && get(row, col + run)) run++;
      path += `M${col} ${row}h${run}v1h-${run}z`;
      col += run;
    }
  }
  return { path, size };
}

async function paintArt(fullName: string, ticketCode: string) {
  await Promise.all([
    document.fonts.load('100px Anton', 'ÁÉÍÓÚÑ'),
    document.fonts.load('800 40px "Manrope Variable"', 'ÁÉÍÓÚÑ'),
    document.fonts.load('700 40px "Manrope Variable"', 'ÁÉÍÓÚÑ'),
  ]);
  const logo = await loadImage('/logo-jbc.jpg');
  const random = seededRandom(ticketCode);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.textBaseline = 'alphabetic';

  const sky = ctx.createLinearGradient(0, 0, 0, TEAR_Y);
  sky.addColorStop(0, '#141f4a');
  sky.addColorStop(0.62, '#2a1230');
  sky.addColorStop(1, NIGHT);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  paintRays(ctx);
  paintFlames(ctx, random);
  paintEmbers(ctx, random);

  const floor = ctx.createLinearGradient(0, 1020, 0, 1120);
  floor.addColorStop(0, 'rgba(10,19,48,0)');
  floor.addColorStop(1, NIGHT);
  ctx.fillStyle = floor;
  ctx.fillRect(0, 1020, W, 100);
  ctx.fillStyle = NIGHT;
  ctx.fillRect(0, 1120, W, TEAR_Y - 1120);

  paintHeader(ctx, logo);
  paintTitle(ctx);
  paintGuest(ctx, fullName);
  paintStub(ctx, ticketCode);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('No se pudo crear el ticket'))), 'image/jpeg', 0.92);
  });
}

export async function buildTicketPdf(fullName: string, ticketCode: string, qrText: string): Promise<Blob> {
  const art = await paintArt(fullName, ticketCode);
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Ticket ${EVENT.name} - ${fullName}`);
  pdf.setAuthor(EVENT.organizer);

  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const image = await pdf.embedJpg(await art.arrayBuffer());
  page.drawImage(image, { x: 0, y: 0, width: PAGE_W, height: PAGE_H });

  const { path, size } = qrPath(qrText);
  page.drawSvgPath(path, {
    x: ((W - QR_SIZE) / 2) * POINTS_PER_PIXEL,
    y: PAGE_H - QR_TOP * POINTS_PER_PIXEL,
    scale: (QR_SIZE * POINTS_PER_PIXEL) / size,
    color: rgb(0.059, 0.11, 0.22),
    borderWidth: 0,
  });

  const bytes = await pdf.save();
  return new Blob([bytes as BlobPart], { type: 'application/pdf' });
}
