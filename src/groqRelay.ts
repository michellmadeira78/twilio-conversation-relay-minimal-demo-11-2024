// src/groqRelay.ts

import WebSocket from 'ws';
import { Buffer } from 'buffer';
import { decode } from 'mulaw-js';

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
 * Converte o áudio da Twilio (µ-law 8kHz) para PCM 16-bit linear e envia para a Groq
 */
export function sendToGroqAudio(groqSocket: WebSocket, base64Payload: string) {
  const ulawBuffer = Buffer.from(base64Payload, 'base64');
  const pcmBuffer = decode(ulawBuffer); // ainda retorna Int16Array

  if (!groqSocket || groqSocket.readyState !== WebSocket.OPEN) {
    console.warn('⚠️ WebSocket da Groq não está aberto');
    return;
  }

  groqSocket.send(Buffer.from(pcmBuffer.buffer));
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
