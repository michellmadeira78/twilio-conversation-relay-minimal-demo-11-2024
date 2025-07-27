import WebSocket from 'ws';
import { Buffer } from 'buffer';
import { decodeUlaw } from './ulaw';
import { debug, info, warn, error, success } from './logger';

/** ------------------------------------------------------------------------
 *  Config
 *  --------------------------------------------------------------------- **/
const DG_KEY = process.env.DEEPGRAM_KEY || '';
if (!DG_KEY) warn('⚠️  DEEPGRAM_KEY não definida — Deepgram inativo.');

const DG_WS_URL =
  process.env.DG_WS_URL ??
  'wss://api.deepgram.com/v1/listen?language=pt-BR&model=nova-3&punctuate=true';

/** ------------------------------------------------------------------------
 *  Conecta WebSocket Deepgram
 *  --------------------------------------------------------------------- **/
export function connectToDeepgram(): WebSocket | undefined {
  if (!DG_KEY) return;

  const socket = new WebSocket(DG_WS_URL, {
    headers: { Authorization: `Token ${DG_KEY}` },
  });

  socket.on('open', () => success('🔗 Deepgram conectado'));
  socket.on('error', (e) => error({ e }, '❌ Deepgram WS erro'));
  socket.on('close', (code, reason) =>
    warn({ code, reason: reason.toString() }, '🔌 Deepgram desconectado'),
  );

  return socket;
}

/** ------------------------------------------------------------------------
 *  Envia chunk ULaw para Deepgram (PCM Int16 8 kHz)
 *  --------------------------------------------------------------------- **/
export function sendToDeepgram(
  socket: WebSocket | undefined,
  base64Payload: string,
) {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    debug('Deepgram socket não aberto — chunk descartado');
    return;
  }

  const ulaw   = Buffer.from(base64Payload, 'base64');
  const pcm16  = decodeUlaw(ulaw);               // Int16Array 16-bit
  socket.send(Buffer.from(pcm16.buffer));

  debug({ bytes: pcm16.byteLength }, '⇢ Deepgram: chunk enviado');
}

/** ------------------------------------------------------------------------
 *  Recebe transcrições e faz log
 *  --------------------------------------------------------------------- **/
export function handleDeepgramMsgs(
  socket: WebSocket | undefined,
  callSid: string,
  onTranscript?: (text: string, isFinal: boolean) => void,
) {
  if (!socket) return;

  socket.on('message', (buf) => {
    try {
      const msg  = JSON.parse(buf.toString());
      const alt  = msg.channel?.alternatives?.[0];
      const text = alt?.transcript?.trim();

      if (text) {
        const final = !!msg.is_final;
        const tag   = final ? '📝 Final' : '✏️ Parcial';

        info({ callSid, text }, `${tag} (Deepgram)`);

        onTranscript?.(text, final);
      }
    } catch (e) {
      error({ e }, '❌ Deepgram JSON parse erro');
    }
  });
}
