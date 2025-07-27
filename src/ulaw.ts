// src/ulaw.ts

export function decodeUlaw(buffer: Buffer): Int16Array {
  const MULAW_DECODE_TABLE = new Int16Array(256);
  for (let i = 0; i < 256; i++) {
    let muLawByte = ~i;
    let sign = (muLawByte & 0x80) ? -1 : 1;
    let exponent = (muLawByte >> 4) & 0x07;
    let mantissa = muLawByte & 0x0F;
    let sample = ((mantissa << 3) + 0x84) << exponent;
    MULAW_DECODE_TABLE[i] = sign * sample;
  }

  const result = new Int16Array(buffer.length);
  for (let i = 0; i < buffer.length; i++) {
    result[i] = MULAW_DECODE_TABLE[buffer[i]];
  }
  return result;
}
