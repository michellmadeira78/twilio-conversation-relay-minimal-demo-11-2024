import fs from 'fs';
import path from 'path';

let audioBuffers: Buffer[] = [];

export function onMedia(payloadBase64: string) {
  const buffer = Buffer.from(payloadBase64, 'base64');
  audioBuffers.push(buffer);
}

export function saveRawAudio(callSid: string): string {
  const raw = Buffer.concat(audioBuffers);
  const outputDir = path.resolve(__dirname, '..', 'calls');
  const rawPath = path.join(outputDir, `call-${callSid}.ulaw`);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(rawPath, raw);
  console.log(`📝 Áudio salvo como: ${rawPath}`);

  // limpa buffer para próxima chamada
  audioBuffers = [];
  return rawPath;
}
