import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { ArrowLeft, CameraOff, CircleAlert, CircleCheck, CircleX, LoaderCircle, RotateCw, WifiOff } from 'lucide-react';
import { ApiError, AdminTicket, checkInToken, CheckInResult, clearSession } from '../lib/api';

type Outcome =
  | { kind: 'checking' }
  | { kind: 'offline'; token: string }
  | { kind: CheckInResult; ticket: AdminTicket | null };

const FRAME_MS = 120;
const SCAN_WIDTH = 640;
const SAME_CODE_PAUSE_MS = 4000;

/** El QR guarda el enlace del ticket; el secreto es su último tramo. */
function tokenFrom(text: string) {
  return text.match(/\/t\/([^/?#\s]+)/)?.[1] ?? text.trim();
}

const VIEW = {
  valid: { Icon: CircleCheck, title: 'Válido', note: 'Puede pasar' },
  used: { Icon: CircleAlert, title: 'Ya usado', note: 'Este ticket ya entró' },
  invalid: { Icon: CircleX, title: 'Inválido', note: 'Este código no es un ticket del congreso' },
};

export default function ScannerPage() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef(document.createElement('canvas'));
  const busy = useRef(false);
  const lastCode = useRef({ token: '', at: 0 });
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [cameraError, setCameraError] = useState('');

  const verify = useCallback(async (token: string) => {
    busy.current = true;
    lastCode.current.token = token;
    setOutcome({ kind: 'checking' });
    try {
      const { result, ticket } = await checkInToken(token);
      setOutcome({ kind: result, ticket });
      navigator.vibrate?.(result === 'valid' ? 120 : [120, 80, 120]);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        clearSession();
        navigate('/admin', { replace: true });
        return;
      }
      setOutcome({ kind: 'offline', token });
    }
  }, [navigate]);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let timer = 0;
    let stopped = false;

    function readFrame() {
      const video = videoRef.current;
      if (!stopped && video && !busy.current && video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        const canvas = canvasRef.current;
        canvas.width = SCAN_WIDTH;
        canvas.height = Math.round(SCAN_WIDTH * video.videoHeight / video.videoWidth);
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
        if (code?.data) {
          const token = tokenFrom(code.data);
          const now = Date.now();
          const justShown = token === lastCode.current.token && now - lastCode.current.at < SAME_CODE_PAUSE_MS;
          if (!justShown) verify(token);
        }
      }
      if (!stopped) timer = window.setTimeout(readFrame, FRAME_MS);
    }

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Este navegador no permite usar la cámara. La página debe abrirse con https.');
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        readFrame();
      } catch {
        if (!stopped) setCameraError('No se pudo abrir la cámara. Permite el acceso en tu navegador y vuelve a intentarlo.');
      }
    }

    start();
    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach(track => track.stop());
    };
  }, [verify]);

  // El último código suele seguir frente a la cámara al continuar: se ignora unos segundos
  function next() {
    lastCode.current.at = Date.now();
    busy.current = false;
    setOutcome(null);
  }

  return (
    <main className="scanner">
      <video ref={videoRef} playsInline muted />
      <header>
        <Link to="/admin/panel" className="icon-button" aria-label="Volver al panel"><ArrowLeft size={22} /></Link>
        <span>Escáner de entrada</span>
      </header>

      {cameraError
        ? <div className="camera-error"><CameraOff size={40} /><p>{cameraError}</p><Link className="ghost" to="/admin/panel">Volver al panel</Link></div>
        : <><div className="frame" aria-hidden="true" /><p className="hint">Apunta al código QR del ticket</p></>}

      {outcome?.kind === 'checking' && (
        <div className="result checking" role="status"><LoaderCircle className="spin" size={56} /><h1>Verificando</h1></div>
      )}

      {outcome?.kind === 'offline' && (
        <div className="result offline" role="alert">
          <WifiOff size={72} />
          <h1>Sin conexión</h1>
          <p>No se confirmó el ingreso. No lo dejes pasar todavía.</p>
          <button onClick={() => verify(outcome.token)}><RotateCw size={20} />Reintentar</button>
          <button className="plain" onClick={next}>Cancelar</button>
        </div>
      )}

      {outcome && (outcome.kind === 'valid' || outcome.kind === 'used' || outcome.kind === 'invalid') && (() => {
        const { Icon, title, note } = VIEW[outcome.kind];
        return (
          <div className={`result ${outcome.kind}`} role="alert">
            <Icon size={96} />
            <h1>{title}</h1>
            {outcome.ticket && <p className="result-name">{outcome.ticket.fullName}</p>}
            <p>{outcome.kind === 'used' && outcome.ticket?.checkedInAt
              ? `Entró a las ${new Date(outcome.ticket.checkedInAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
              : note}</p>
            <button onClick={next}>Escanear siguiente</button>
          </div>
        );
      })()}
    </main>
  );
}
