import WebSocket from 'ws';
import { Buffer } from 'buffer';
import { decodeUlaw } from './ulaw';

const DG_URL = 'wss://api.deepgram.com/v1/listen';
const DG_KEY = process.env.DEEPGRAM_KEY || '';

if (!DG_KEY) console.warn('⚠️  DEEPGRAM_KEY não definida');

/* Conecta ao WebSocket da Deepgram */
export function connectToDeepgram(): WebSocket {
  const dgSocket = new WebSocket(DG_URL, {
    headers: { Authorization: `Token ${DG_KEY}` },
  });

  dgSocket.on('open', () => console.log('🔗 Deepgram conectado'));
  dgSocket.on('error', (e) => console.error('❌ Deepgram WS erro:', e));

  return dgSocket;
}

/* Envia cada payload da Twilio para a Deepgram (raw PCM 8 kHz) */
export function sendToDeepgram(dgSocket: WebSocket, base64Payload: string) {
  if (!dgSocket || dgSocket.readyState !== WebSocket.OPEN) return;

  const ulaw = Buffer.from(base64Payload, 'base64');
  const pcm16 = decodeUlaw(ulaw);           // Int16Array 16-bit
  dgSocket.send(Buffer.from(pcm16.buffer)); // Deepgram aceita buffer cru
}

/* Recebe transcrições e imprime */
export function handleDeepgramMsgs(dgSocket: WebSocket, callSid: string) {
  dgSocket.on('message', (buf) => {
    try {
      const msg = JSON.parse(buf.toString());
      const alt = msg.channel?.alternatives?.[0];
      if (alt?.transcript) {
        const text = alt.transcript.trim();
        if (text) {
          const type = msg.is_final ? '📝 Final' : '✏️ Parcial';
          console.log(`${type} [${callSid}]: ${text}`);
        }
      }
    } catch (e) {
      console.error('❌ Deepgram JSON erro:', e);
    }
  });
}
