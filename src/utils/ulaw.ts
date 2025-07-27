/**
 * Converte um buffer µ-law (8-bit) para PCM linear 16-bit.
 * Compatível com áudio da Twilio (8kHz, mono, µ-law).
 */
export function decodeUlaw(ulawBuffer: Buffer): Int16Array {
  const MULAW_MAX = 0x1FFF;
  const MULAW_BIAS = 33;

  const ulawDecodeTable = new Int16Array(256);

  for (let i = 0; i < 256; i++) {
    let uval = ~i & 0xff;
    let t = ((uval & 0x0f) << 3) + MULAW_BIAS;
    t <<= (uval & 0x70) >> 4;
    if (uval & 0x80) {
      t = MULAW_BIAS - t;
    } else {
      t = t - MULAW_BIAS;
    }
    ulawDecodeTable[i] = t;
  }

  const out = new Int16Array(ulawBuffer.length);
  for (let i = 0; i < ulawBuffer.length; i++) {
    out[i] = ulawDecodeTable[ulawBuffer[i]];
  }

  return out;
}
