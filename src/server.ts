// src/server.ts

import http from 'http';
import express from 'express';
import WebSocket from 'ws';

import { onMedia, saveRawAudio } from './audioCapture';
import {
  connectToDeepgram,
  sendToDeepgram,
  handleDeepgramMsgs,
} from './deepgramRelay';          // ⬅️ novo relay

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server, path: '/relay' });

wss.on('connection', (socket) => {
  console.log('🔌 Twilio WebSocket conectado');

  let currentCallSid = '';
  let dgSocket: WebSocket | null = null;

  socket.on('message', async (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log('📨 Evento recebido:', msg.event);

      switch (msg.event) {
        /* ------------------------- início da chamada ------------------------- */
        case 'start':
          currentCallSid = msg.start.callSid;
          console.log(`📞 Ligação iniciada: ${currentCallSid}`);

          // conecta à Deepgram e começa a escutar as transcrições
          dgSocket = connectToDeepgram();
          handleDeepgramMsgs(dgSocket, currentCallSid);
          break;

        /* -------------------------- pacotes de áudio -------------------------- */
        case 'media':
          onMedia(msg.media.payload);                          // grava .ulaw
          if (dgSocket && dgSocket.readyState === WebSocket.OPEN) {
            sendToDeepgram(dgSocket, msg.media.payload);      // envia à Deepgram
          }
          break;

        /* ---------------------------- fim da call ---------------------------- */
        case 'stop':
          const path = saveRawAudio(currentCallSid);
          console.log(`✅ Ligação encerrada. Áudio bruto salvo em ${path}`);
          console.log(`🎧 Para converter: ffmpeg -f mulaw -ar 8000 -ac 1 -i ${path} ${path.replace('.ulaw', '.wav')}`);

          if (dgSocket) {
            dgSocket.close();
            console.log('🛑 Conexão com Deepgram encerrada');
          }
          break;

        default:
          console.warn(`⚠️ Evento desconhecido: ${msg.event}`);
      }
    } catch (err) {
      console.error('❌ Erro ao processar mensagem da Twilio:', err);
    }
  });

  socket.on('close', () => {
    console.log('🔴 Conexão com Twilio encerrada');
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🟢 Servidor WebSocket ouvindo na porta ${PORT}`);
});
