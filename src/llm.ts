/**
 * Versão simplificada: remove OpenAI e apenas devolve
 * um texto ecoando o que o usuário disse.
 * Mantém a mesma assinatura pública de funções-chave
 * para não quebrar imports em outros arquivos.
 */

import EventEmitter from "events";

/* ------------------------------------------------------------------ */
/* 1.  EventEmitter opcional – dispara “speech” p/ quem escutar       */
/* ------------------------------------------------------------------ */

type SpeechListener = (text: string, isLast: boolean) => void;

class LLMEventEmitter extends EventEmitter {
  on(event: "speech", listener: SpeechListener): this {
    return super.on(event, listener);
  }
  emit(event: "speech", text: string, isLast: boolean): boolean {
    return super.emit(event, text, isLast);
  }
}

const emitter = new LLMEventEmitter();
export const on = emitter.on.bind(emitter); // permite: llm.on("speech", ...)

/* ------------------------------------------------------------------ */
/* 2.  API principal – resposta síncrona de eco                        */
/* ------------------------------------------------------------------ */

export async function getAssistantResponse(text: string): Promise<string> {
  const reply = `Você disse: ${text}`;
  // avisa a quem estiver ouvindo que a fala terminou (isLast = true)
  emitter.emit("speech", reply, true);
  return reply;
}

/* ------------------------------------------------------------------ */
/* 3.  Stubs (mantêm compatibilidade se outros arquivos chamarem)     */
/* ------------------------------------------------------------------ */

// não há streaming nem ferramentas nesta versão; são NO-OP
export function startRun() {/* no-op */}
export function abort()    {/* no-op */}
export function interrupt(_: string) {/* no-op */}
export function reset()    {/* no-op */}
