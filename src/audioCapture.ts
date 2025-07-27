import fs from 'fs';
import path from 'path';
import { debug, info, warn } from './logger';           // <<< novo logger

// Map para buffers de áudio por ligação ➜ permite tratar várias chamadas em paralelo
const callBuffers: Record<string, Buffer[]> = {};

/** ------------------------------------------------------------------------
 *  Acionado pelo webhook da Twilio (evento “media”)
 *  --------------------------------------------------------------------- **/
export function onMedia(callSid: string, payloadBase64: string) {
  if (!callBuffers[callSid]) callBuffers[callSid] = [];

  const chunk = Buffer.from(payloadBase64, 'base64');
  callBuffers[callSid].push(chunk);

  debug({ callSid, bytes: chunk.length }, '🎙️  Chunk recebido');
}

/** ------------------------------------------------------------------------
 *  Concatena e grava o .ulaw em disco
 *  --------------------------------------------------------------------- **/
export function saveRawAudio(callSid: string): string {
  const buffers = callBuffers[callSid] ?? [];

  if (!buffers.length) {
    warn({ callSid }, '⚠️  Nenhum buffer para gravar');
    return '';
  }

  const raw = Buffer.concat(buffers);
  const outputDir = path.resolve(__dirname, '..', 'calls');
  const rawPath   = path.join(outputDir, `call-${callSid}.ulaw`);

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(rawPath, raw);

  info(
    { callSid, rawPath, bytes: raw.length },
    '📝 Áudio (.ulaw) salvo'
  );

  // limpa buffers apenas desta ligação
  delete callBuffers[callSid];
  return rawPath;
}
