import WebSocket from 'ws';
import { Buffer } from 'buffer';
import { decodeUlaw } from './ulaw';

const GROQ_WS_URL = 'wss://whisper.groq.com/v1/audio/stream';
const GROQ_API_KEY = process.env.GROQ_API_KEY || ''; // defina via .env ou Railway secrets

if (!GROQ_API_KEY) {
  console.warn('⚠️ GROQ_API_KEY não definida');
}

/**
 * Conecta ao WebSocket da Groq para transcrição em tempo real
 */
export async function connectToGroq(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(GROQ_WS_URL, {
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
    });

    socket.on('open', () => {
      console.log('🔗 Conectado à Groq Whisper WebSocket');
      resolve(socket);
    });

    socket.on('error', (err) => {
      console.error('❌ Erro na conexão com Groq:', err);
      reject(err);
    });
  });
}

/**
 * Adiciona cabeçalho WAV para que o Groq aceite o buffer de áudio
 */
function addWavHeader(pcm: Int16Array, sampleRate = 8000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const dataSize = pcm.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0); // ChunkID
  buffer.writeUInt32LE(36 + dataSize, 4); // ChunkSize
  buffer.write('WAVE', 8); // Format

  buffer.write('fmt ', 12); // Subchunk1ID
  buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 para PCM)
  buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  buffer.writeUInt16LE(numChannels, 22); // NumChannels
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate
  buffer.writeUInt32LE(byteRate, 28); // ByteRate
  buffer.writeUInt16LE(blockAlign, 32); // BlockAlign
  buffer.writeUInt16LE(bitsPerSample, 34); // BitsPerSample

  buffer.write('data', 36); // Subchunk2ID
  buffer.writeUInt32LE(dataSize, 40); // Subchunk2Size

  const pcmBuffer = Buffer.from(pcm.buffer);
  pcmBuffer.copy(buffer, 44);

  return buffer;
}

/**
 * Converte o áudio da Twilio (µ-law 8kHz) para WAV e envia para a Groq
 */
export function sendToGroqAudio(groqSocket: WebSocket, base64Payload: string) {
  if (!groqSocket || groqSocket.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ WebSocket da Groq não está aberto');
    return;
  }

  try {
    const ulawBuffer = Buffer.from(base64Payload, 'base64');
    const pcm = decodeUlaw(ulawBuffer); // retorna Int16Array
    const wavBuffer = addWavHeader(pcm); // WAV com cabeçalho válido

    groqSocket.send(wavBuffer);
  } catch (error) {
    console.error('❌ Erro ao converter e enviar áudio para Groq:', error);
  }
}

/**
 * Escuta respostas do WebSocket da Groq e exibe as transcrições
 */
export function handleGroqMessages(groqSocket: WebSocket, callSid: string) {
  groqSocket.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());

      if (msg.type === 'partial') {
        console.log(`✏️ [${callSid}] Parcial: ${msg.text}`);
      }

      if (msg.type === 'final') {
        console.log(`📝 [${callSid}] Final: ${msg.text}`);
      }
    } catch (err) {
      console.error('❌ Erro ao processar mensagem da Groq:', err);
    }
  });
}
