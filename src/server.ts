import http from 'http';
import express from 'express';
import WebSocket from 'ws';

const app = express();
const server = http.createServer(app);

const wss = new WebSocket.Server({ server, path: '/relay' });

wss.on('connection', (socket) => {
  console.log('🔌 Twilio WebSocket conectado');

  socket.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log('📨 Evento recebido:', msg.event);
    } catch (err) {
      console.error('Erro ao parsear mensagem:', err);
    }
  });

  socket.on('close', () => {
    console.log('🔴 Conexão encerrada');
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🟢 Servidor WebSocket ouvindo na porta ${PORT}`);
});
