import fs   from 'fs';
import path from 'path';
import pino, { multistream } from 'pino';
import pretty from 'pino-pretty';

/* ------------------------------------------------------------------ *
 * Helpers de tempo
 * ------------------------------------------------------------------ */
let bootTs = Date.now();
const elapsed = () => {
  const d  = Date.now() - bootTs;
  const mm = Math.floor(d / 6e4);
  const ss = Math.floor((d % 6e4) / 1e3);
  const ms = d % 1e3;
  return `${String(mm).padStart(3,'0')}m ${String(ss).padStart(2,'0')}s ${String(ms).padStart(3,'0')}ms`;
};

/* ------------------------------------------------------------------ *
 * Destinos
 * ------------------------------------------------------------------ */
const LOG_DIR = path.join(__dirname,'..','logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR,{ recursive:true });

const makeFileStream = () =>
  pino.destination({ dest: path.join(LOG_DIR,`session_${Date.now()}.log`), sync:true });

/* ------------------------------------------------------------------ *
 * Tipo auxiliar para logger com nível "success"
 * ------------------------------------------------------------------ */
type MyLogger = pino.Logger<'success', boolean>;

/* ------------------------------------------------------------------ *
 * Fábrica de loggers (multistream, single thread)
 * ------------------------------------------------------------------ */
function buildLogger(): MyLogger {
  const streams = multistream([
    { level:'debug', stream: pretty({
        translateTime:'SYS:standard',
        ignore:'pid,hostname',
        colorize:true,
      }) },
    { level:'debug', stream: makeFileStream() },
  ]);

  return pino(
    {
      level: process.env.LOG_LEVEL || 'info',
      customLevels: { success: 35 },
      formatters: { level: l => ({ level: l }) },
    } as const,
    streams,
  );
}

let logger: MyLogger = buildLogger();   // instância inicial

/* ------------------------------------------------------------------ *
 * API de log
 * ------------------------------------------------------------------ */
type Args = unknown[];
const stringify = (a: Args) =>
  a.map(m => (typeof m === 'object' ? JSON.stringify(m, null, 2) : String(m))).join(' ');
const wrap = (a: Args) => `${elapsed()} | ${stringify(a)}`;

export const debug   = (...m: Args) => logger.debug (wrap(m));
export const info    = (...m: Args) => logger.info  (wrap(m));
export const warn    = (...m: Args) => logger.warn  (wrap(m));
export const error   = (...m: Args) => logger.error (wrap(m));
export const success = (...m: Args) =>
  (logger as any).success?.(wrap(m)) ?? logger.info(wrap(m));

/* ------------------------------------------------------------------ *
 * reset() → novo arquivo + zera cronômetro
 * ------------------------------------------------------------------ */
export function reset(): void {
  bootTs = Date.now();
  logger.flush();           // flush do arquivo atual
  logger = buildLogger();   // nova instância / novo arquivo
  info('🌀 Log resetado: nova sessão iniciada');
}

export { logger };
