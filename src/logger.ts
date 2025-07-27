import fs   from 'fs';
import path from 'path';
import pino from 'pino';

/* ------------------------------------------------------------------ *
 * Helpers de tempo
 * ------------------------------------------------------------------ */
let bootTs = Date.now();

function elapsed() {
  const diff = Date.now() - bootTs;
  const min  = Math.floor(diff / 6e4);
  const sec  = Math.floor((diff % 6e4) / 1e3);
  const ms   = diff % 1e3;
  return `${String(min).padStart(3, '0')}m ${String(sec).padStart(2, '0')}s ${String(ms).padStart(3, '0')}ms`;
}

/* ------------------------------------------------------------------ *
 * Destino de arquivo (.log)
 * ------------------------------------------------------------------ */
const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const newFileDest = () =>
  pino.destination({ dest: path.join(LOG_DIR, `session_${Date.now()}.log`), sync: false });

/* ------------------------------------------------------------------ *
 * Instância principal do Pino
 * ------------------------------------------------------------------ */
const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    customLevels: { success: 35 },               // INFO=30 < SUCCESS=35 < WARN=40
    formatters: {
      level(label) {
        return { level: label };
      },
    },
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
          messageFormat: (_log: unknown, msg: string) => `${elapsed()} | ${msg}`,
        },
      },
      {
        target:  'pino/file',
        level:   'debug',
        options: { destination: newFileDest() },
      },
    ],
  }),
);

/* ------------------------------------------------------------------ *
 * API compatível com console.* antigos
 * ------------------------------------------------------------------ */
type Args = unknown[];
const serialize = (args: Args) =>
  args.map((m) => (typeof m === 'object' ? JSON.stringify(m, null, 2) : m)).join(' ');

export const debug   = (...m: Args) => logger.debug(serialize(m));
export const info    = (...m: Args) => logger.info(serialize(m));
export const warn    = (...m: Args) => logger.warn(serialize(m));
export const error   = (...m: Args) => logger.error(serialize(m));
export const success = (...m: Args) =>
  (logger as any).success?.(serialize(m)) ?? logger.info(serialize(m));

/* ------------------------------------------------------------------ *
 * reset() → zera cronômetro e cria novo arquivo de log
 * ------------------------------------------------------------------ */
export function reset() {
  bootTs = Date.now();

  const lg: any = logger;          // elide tipos para acessar internals
  lg.flush?.();                    // garante flush do arquivo atual

  // substitui somente o stream de arquivo (2º target)
  if (Array.isArray(lg.transport?.targets) && lg.transport.targets[1]) {
    lg.transport.targets[1].stream = newFileDest();
  }

  info('🌀 Log resetado: nova sessão iniciada');
}

/* ------------------------------------------------------------------ *
 * Export opcional do logger bruto (caso precise em outros módulos)
 * ------------------------------------------------------------------ */
export { logger };
