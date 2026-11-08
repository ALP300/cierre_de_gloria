import QRCode from 'qrcode';
import { EVENT, eventWhen, eventWhere } from '../event.config';

const NAVY = '#0f1c38';
const INK = '#14275c';
const MUTED = '#5d6985';

const WIDTH = 1080;
const HEIGHT = 1760;
const MARGIN = 56;
const CARD_RIGHT = WIDTH - MARGIN;
const HEAD_HEIGHT = 640;
const PERFORATION_Y = 1090;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('No se pudo cargar el logo'));
    image.src = src;
  });
}

/** Deja el nombre en una línea grande o, si es largo, en dos líneas ajustadas al ancho. */
function nameLines(ctx: CanvasRenderingContext2D, name: string, maxWidth: number) {
  const widestFits = (lines: string[], size: number) => {
    ctx.font = `${size}px Anton`;
    return lines.every(line => ctx.measureText(line).width <= maxWidth);
  };

  for (let size = 92; size >= 72; size -= 4) {
    if (widestFits([name], size)) return [name];
  }

  const spaces = [...name.matchAll(/ /g)].map(match => match.index);
  const middle = spaces.reduce((best, index) => Math.abs(index - name.length / 2) < Math.abs(best - name.length / 2) ? index : best, spaces[0] ?? name.length);
  const lines = [name.slice(0, middle), name.slice(middle + 1)].filter(Boolean);
  let size = 66;
  while (!widestFits(lines, size) && size > 24) size -= 2;
  return lines;
}

function glow(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(MARGIN, MARGIN, WIDTH - MARGIN * 2, HEAD_HEIGHT);
}

export async function buildTicketImage(fullName: string, ticketCode: string, qrText: string): Promise<Blob> {
  await Promise.all([document.fonts.load('100px Anton'), document.fonts.load('600 40px "Manrope Variable"')]);
  const logo = await loadImage('/logo-jbc.jpg');
  const qr = document.createElement('canvas');
  await QRCode.toCanvas(qr, qrText, { width: 460, margin: 0, errorCorrectionLevel: 'M', color: { dark: '#0f1c38', light: '#ffffff' } });

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = NAVY;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(MARGIN, MARGIN, WIDTH - MARGIN * 2, HEIGHT - MARGIN * 2, 56);
  ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.fillStyle = '#14233f';
  ctx.fillRect(MARGIN, MARGIN, WIDTH - MARGIN * 2, HEAD_HEIGHT);
  glow(ctx, 860, 110, 640, 'rgba(255,118,28,0.82)');
  glow(ctx, 170, 660, 480, 'rgba(255,190,80,0.34)');
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(190, 190, 84, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.clip();
  ctx.drawImage(logo, 106, 106, 168, 168);
  ctx.restore();

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 34px "Manrope Variable"';
  ctx.fillText(EVENT.organizer, 306, 180);
  ctx.fillStyle = '#ffd08a';
  ctx.font = '600 28px "Manrope Variable"';
  ctx.fillText('Entrada gratuita', 306, 224);

  ctx.fillStyle = '#fff6e8';
  ctx.font = '150px Anton';
  ctx.fillText('CIERRE DE', 106, 450);
  const title = ctx.createLinearGradient(0, 480, 0, 650);
  title.addColorStop(0, '#ffd27a');
  title.addColorStop(1, '#ff7a1f');
  ctx.fillStyle = title;
  ctx.font = '176px Anton';
  ctx.fillText('GLORIA', 106, 640);

  ctx.fillStyle = MUTED;
  ctx.font = '700 28px "Manrope Variable"';
  ctx.fillText('ENTRADA A NOMBRE DE', 106, 780);
  ctx.fillStyle = INK;
  const lines = nameLines(ctx, fullName.toUpperCase(), WIDTH - 212);
  if (lines.length === 1) {
    ctx.fillText(lines[0], 106, 890);
  } else {
    ctx.fillText(lines[0], 106, 850);
    ctx.fillText(lines[1], 106, 924);
  }

  ctx.fillStyle = INK;
  ctx.font = '700 34px "Manrope Variable"';
  ctx.fillText(eventWhen(), 106, 970);
  ctx.fillStyle = MUTED;
  ctx.font = '600 32px "Manrope Variable"';
  ctx.fillText(eventWhere(), 106, 1022);

  ctx.setLineDash([16, 16]);
  ctx.strokeStyle = '#c9d0de';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(MARGIN + 60, PERFORATION_Y);
  ctx.lineTo(CARD_RIGHT - 60, PERFORATION_Y);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = NAVY;
  for (const x of [MARGIN, CARD_RIGHT]) {
    ctx.beginPath();
    ctx.arc(x, PERFORATION_Y, 40, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.drawImage(qr, (WIDTH - 460) / 2, 1140);

  ctx.textAlign = 'center';
  ctx.fillStyle = INK;
  ctx.font = '800 36px "Manrope Variable"';
  ctx.fillText(ticketCode, WIDTH / 2, 1656);

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('No se pudo crear la imagen'))), 'image/png');
  });
}
