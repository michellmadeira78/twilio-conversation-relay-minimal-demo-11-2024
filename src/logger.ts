import fs   from 'fs';
import path from 'path';
import pino from 'pino';

/* ------------------------------------------------------------------ *
 * Helpers de tempo
 * ------------------------------------------------------------------ */
let bootTs = Date.now();
const elapsed = (): string => {
  const d  = Date.now() - bootTs;
  const mm = Math.floor(d / 6e4);
  const ss = Math.floor((d % 6e4) / 1e3);
  const ms = d % 1e3;
  return `${String(mm).padStart(3, '0')}m ${String(ss).padStart(2, '0')}s ${String(ms).padStart(3, '0')}ms`;
};

/* ------------------------------------------------------------------ *
 * Destino de arquivo (.log) – sync:true evita SonicBoom crash
 * ------------------------------------------------------------------ */
const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const newFileDest = () =>
  pino.destination({
    dest: path.join(LOG_DIR, `session_${Date.now()}.log`),
    sync: true,
  });

/* ------------------------------------------------------------------ *
 * Instância principal do Pino
 * ------------------------------------------------------------------ */
const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    customLevels: { success: 35 },            // INFO=30 < SUCCESS=35 < WARN=40
    formatters: { level: l => ({ level: l }) },
  },
  pino.transport({
    targets: [
      {
        target: 'pino-pretty',
        level:  'debug',
        options: {
          translateTime: 'SYS:standard',
          ignore:        'pid,hostname',
          colorize:      true,
          messageFormat: (_: unknown, msg: string) => `${elapsed()} | ${msg}`,
        },
        worker: { enabled: false } as any,    // ✨ evita DataCloneError
      },
      {
        target:  'pino/file',
        level:   'debug',
        options: { destination: newFileDest() },
        worker:  { enabled: false } as any,   // ✨ idem
      },
    ],
  }),
);

/* ------------------------------------------------------------------ *
 * API compatível com console.* antigos
 * ------------------------------------------------------------------ */
type Args = unknown[];
const ser = (a: Args) =>
  a.map(m => (typeof m === 'object' ? JSON.stringify(m, null, 2) : m)).join(' ');

export const debug   = (...m: Args) => logger.debug (ser(m));
export const info    = (...m: Args) => logger.info  (ser(m));
export const warn    = (...m: Args) => logger.warn  (ser(m));
export const error   = (...m: Args) => logger.error (ser(m));
export const success = (...m: Args) =>
  (logger as any).success?.(ser(m)) ?? logger.info(ser(m));

/* ------------------------------------------------------------------ *
 * reset() → zera cronômetro e inicia novo arquivo de log
 * ------------------------------------------------------------------ */
export function reset(): void {
  bootTs = Date.now();

  const lg: any = logger;
  if (Array.isArray(lg.transport?.targets) && lg.transport.targets[1]) {
    lg.transport.targets[1].stream = newFileDest(); // novo arquivo
  }

  info('🌀 Log resetado: nova sessão iniciada');
}

/* ------------------------------------------------------------------ */
export { logger };
