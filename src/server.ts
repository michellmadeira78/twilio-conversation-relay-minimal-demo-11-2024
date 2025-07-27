import http from 'http';
import express from 'express';
import WebSocket from 'ws';
import { onMedia, saveRawAudio } from './audioCapture';

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: '/relay' });

wss.on('connection', (socket) => {
  console.log('🔌 Twilio WebSocket conectado');

  let currentCallSid = '';

  socket.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log('📨 Evento recebido:', msg.event);

      if (msg.event === 'start') {
        currentCallSid = msg.start.callSid;
        console.log(`📞 Ligação iniciada: ${currentCallSid}`);
      }

      if (msg.event === 'media') {
        onMedia(msg.media.payload);
      }

      if (msg.event === 'stop') {
        const path = saveRawAudio(currentCallSid);
        console.log(`✅ Ligação encerrada. Áudio bruto salvo em ${path}`);
        console.log(`🎧 Para converter: ffmpeg -f mulaw -ar 8000 -ac 1 -i ${path} ${path.replace('.ulaw', '.wav')}`);
      }

    } catch (err) {
      console.error('❌ Erro ao parsear mensagem:', err);
    }
  });

  socket.on('close', () => {
    console.log('🔴 Conexão encerrada');
  });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🟢 Servidor WebSocket ouvindo na porta ${PORT}`);
});
