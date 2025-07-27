import http            from 'http';
import express         from 'express';
import WebSocket       from 'ws';

import { onMedia, saveRawAudio }  from './audioCapture';
import {
  connectToDeepgram,
  sendToDeepgram,
  handleDeepgramMsgs,
} from './deepgram';                       // ← nome do arquivo refatorado
import { info, debug, warn, error, success, reset } from './logger';

/** ------------------------------------------------------------------------
 *  Bootstrap
 *  --------------------------------------------------------------------- **/
const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server, path: '/relay' });

/** ------------------------------------------------------------------------
 *  Conexões WebSocket – Twilio ➜ Nosso servidor
 *  --------------------------------------------------------------------- **/
wss.on('connection', (socket) => {
  info('🔌 Twilio WebSocket conectado');

  let callSid = '';
  let dgSocket: WebSocket | undefined;

  socket.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      debug({ event: msg.event }, '📨 Evento recebido');

      switch (msg.event) {
        /* ------------------------- início da chamada --------------------- */
        case 'start': {
          reset();                                    // novo arquivo de log
          callSid = msg.start.callSid;
          info({ callSid }, '📞 Ligação iniciada');

          dgSocket = connectToDeepgram();
          handleDeepgramMsgs(dgSocket, callSid);
          break;
        }

        /* -------------------------- pacotes de áudio -------------------- */
        case 'media': {
          onMedia(callSid, msg.media.payload);        // grava ULaw local
          sendToDeepgram(dgSocket, msg.media.payload);
          break;
        }

        /* --------------------------- fim da call ------------------------ */
        case 'stop': {
          const rawPath = saveRawAudio(callSid);
          success({ rawPath }, '✅ Ligação encerrada — áudio salvo');

          if (dgSocket) {
            dgSocket.close();
            debug('🛑 Deepgram socket fechado');
          }
          break;
        }

        default:
          warn({ event: msg.event }, '⚠️  Evento desconhecido');
      }
    } catch (err) {
      error({ err }, '❌ Erro ao processar mensagem da Twilio');
    }
  });

  socket.on('close', () => {
    warn('🔴 Conexão com Twilio encerrada');
  });
});

/** ------------------------------------------------------------------------
 *  HTTP + WS listener
 *  --------------------------------------------------------------------- **/
const PORT = Number(process.env.PORT) || 8080;
server.listen(PORT, () => {
  info(`🟢 Servidor WebSocket ouvindo na porta ${PORT}`);
});
