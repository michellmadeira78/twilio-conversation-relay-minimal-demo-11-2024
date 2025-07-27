/**
 * Versão enxuta para o demo “eco”.
 * – Remove dependência do SDK oficial `twilio`
 * – Mantém mesmas funções públicas para não quebrar imports
 * – As ações que chamavam a API agora apenas fazem log
 */

import type { WebSocket } from "ws";
import * as log from "./logger";
import {
  EndSession,
  SendTextToken,
  TwilioRelayMessage,
  TwilioRelayMessageTypes,
} from "./twilio-types";

/* ------------------------------------------------------------------ */
/* 1. Variáveis de sessão (um único call/WS por vez – como no template)*/
/* ------------------------------------------------------------------ */

export let callSid: string | undefined;
export const setCallSid = (sid: string) => (callSid = sid);

export let ws: WebSocket | undefined; // ConversationRelay WebSocket
export const setWs = (wss: WebSocket) => (ws = wss);

export function reset() {
  callSid = undefined;
  ws?.close();
  ws?.on("close", () => (ws = undefined));
}

/* ------------------------------------------------------------------ */
/* 2.  ConversationRelay – enviar comandos “end” e “text”             */
/* ------------------------------------------------------------------ */

export function endSession(handoffData: Record<string, unknown> = {}) {
  const action: EndSession = {
    type: "end",
    handoffData: JSON.stringify(handoffData),
  };
  ws?.send(JSON.stringify(action));
}

export function textToSpeech(token: string, last = false) {
  const action: SendTextToken = { type: "text", token, last };
  ws?.send(JSON.stringify(action));
}

/* ------------------------------------------------------------------ */
/* 3.  Listener auxiliar para receber mensagens do Relay               */
/* ------------------------------------------------------------------ */

export function onMessage<T extends TwilioRelayMessageTypes>(
  type: T,
  callback: (msg: TwilioRelayMessage & { type: T }) => void
) {
  ws?.on("message", (data) => {
    const msg = JSON.parse(data.toString()) as TwilioRelayMessage;
    if (msg.type === type) callback(msg as TwilioRelayMessage & { type: T });
  });
}

/* ------------------------------------------------------------------ */
/* 4.  Stub de gravação de chamada – só faz log                       */
/* ------------------------------------------------------------------ */

export async function startCallRecording() {
  log.info(
    `startCallRecording() chamado – SDK Twilio removido nesta versão demo; nenhuma gravação iniciada.`
  );
}
