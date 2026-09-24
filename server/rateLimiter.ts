import { Request, Response, NextFunction } from 'express';
import { getPool } from './db.js';

export interface RateLimitInfo {
  points: number;
  resetTimeMs: number;
  isBlocked: boolean;
  remainingPoints: number;
}

export interface RateLimitOptions {
  actionName: string;
  actionLabel: string;
  ipMax: number;
  ipWindowSeconds: number;
  accountMax?: number;
  accountWindowSeconds?: number;
  extractIdentifier?: (req: Request) => string | undefined;
}

// Memory fallback store for high speed / offline DB support
const inMemoryStore = new Map<string, { points: number; expireAt: number }>();

// Periodic cleanup of expired in-memory keys
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of inMemoryStore.entries()) {
    if (v.expireAt <= now) {
      inMemoryStore.delete(k);
    }
  }
}, 60000);

export function getClientIp(req: Request): string {
  const forwarded = req.headers ? req.headers['x-forwarded-for'] : undefined;
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket?.remoteAddress || req.ip || '127.0.0.1';
}

export function normalizeIdentifier(identifier?: string): string {
  if (!identifier) return '';
  const clean = String(identifier).trim().toLowerCase();
  if (clean.includes('@')) {
    return clean;
  }
  // Se for CPF com pontuação, normaliza para dígitos
  const digitsOnly = clean.replace(/\D/g, '');
  if (digitsOnly.length === 11) {
    return digitsOnly;
  }
  return clean;
}

export function maskIdentifier(identifier?: string): string {
  if (!identifier) return 'anonymous';
  const clean = String(identifier).trim();
  if (clean.includes('@')) {
    const [user, domain] = clean.split('@');
    const maskedUser = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0]}***`;
    return `${maskedUser}@${domain}`;
  }
  const digits = clean.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.***.***-${digits.slice(9)}`;
  }
  if (clean.length > 3) {
    return `${clean.slice(0, 2)}***${clean.slice(-1)}`;
  }
  return '***';
}

export function maskIp(ip: string): string {
  if (!ip) return '0.0.0.0';
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.***.***`;
    }
  }
  if (ip.includes(':')) {
    return `${ip.split(':')[0]}:****`;
  }
  return '***.***.***';
}

/**
 * Consome pontos de rate limit de forma atômica no MySQL com fallback em memória.
 */
export async function consumeRateLimit(
  key: string,
  maxPoints: number,
  windowSeconds: number
): Promise<RateLimitInfo> {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const newExpireAt = now + windowMs;

  try {
    const pool = getPool();
    if (pool) {
      // 1. Limpeza/Incremento atômico no MySQL
      await pool.query(
        `INSERT INTO rate_limits (key_id, points, expire_at, updated_at)
         VALUES (?, 1, ?, ?)
         ON DUPLICATE KEY UPDATE
           points = IF(expire_at <= ?, 1, points + 1),
           expire_at = IF(expire_at <= ?, ?, expire_at),
           updated_at = ?`,
        [key, newExpireAt, now, now, now, newExpireAt, now]
      );

      // 2. Consulta estado atualizado
      const [rows]: any = await pool.query(
        `SELECT points, expire_at FROM rate_limits WHERE key_id = ? LIMIT 1`,
        [key]
      );

      if (rows && rows.length > 0) {
        const points = Number(rows[0].points);
        const resetTimeMs = Number(rows[0].expire_at);
        const isBlocked = points > maxPoints;
        const remainingPoints = Math.max(0, maxPoints - points);

        return { points, resetTimeMs, isBlocked, remainingPoints };
      }
    }
  } catch (err) {
    // Fallback silencioso para memória em caso de indisponibilidade momentânea do banco
    // Não interrompe o fluxo legítimo do usuário
  }

  // Fallback em memória
  const entry = inMemoryStore.get(key);
  if (!entry || entry.expireAt <= now) {
    inMemoryStore.set(key, { points: 1, expireAt: newExpireAt });
    return {
      points: 1,
      resetTimeMs: newExpireAt,
      isBlocked: maxPoints < 1,
      remainingPoints: Math.max(0, maxPoints - 1)
    };
  } else {
    entry.points += 1;
    const isBlocked = entry.points > maxPoints;
    const remainingPoints = Math.max(0, maxPoints - entry.points);
    return {
      points: entry.points,
      resetTimeMs: entry.expireAt,
      isBlocked,
      remainingPoints
    };
  }
}

/**
 * Reseta os pontos de rate limit (ex: após login bem-sucedido).
 */
export async function resetRateLimitKey(key: string): Promise<void> {
  inMemoryStore.delete(key);
  try {
    const pool = getPool();
    if (pool) {
      await pool.query(`DELETE FROM rate_limits WHERE key_id = ?`, [key]);
    }
  } catch (err) {
    // ignora erro silenciosamente
  }
}

/**
 * Cria um middleware de Rate Limiting com controle duplo (IP + Identificador de Conta).
 */
export function createRateLimiterMiddleware(options: RateLimitOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Permite desativar rate limiting explicitamente em testes se RATE_LIMIT_ENABLED === 'false'
    if (process.env.RATE_LIMIT_ENABLED === 'false') {
      return next();
    }

    const ip = getClientIp(req);
    const ipKey = `rl:ip:${options.actionName}:${ip}`;

    // 1. Validação por IP
    const ipResult = await consumeRateLimit(ipKey, options.ipMax, options.ipWindowSeconds);

    if (ipResult.isBlocked) {
      const retryAfterSec = Math.max(1, Math.ceil((ipResult.resetTimeMs - Date.now()) / 1000));
      const retryMin = Math.ceil(retryAfterSec / 60);

      // Registra evento de auditoria sem expor senhas
      console.warn(
        `🚨 [SEGURANÇA / RATE-LIMIT] Limite por IP excedido na ação "${options.actionName}". IP: ${maskIp(ip)}, Aguardar: ${retryAfterSec}s`
      );

      res.set({
        'Retry-After': String(retryAfterSec),
        'X-RateLimit-Limit': String(options.ipMax),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.ceil(ipResult.resetTimeMs / 1000))
      });

      res.status(429).json({
        error: `Muitas tentativas de ${options.actionLabel} a partir deste endereço de IP. Por segurança, tente novamente em ${retryMin} minuto(s).`,
        code: 'TOO_MANY_REQUESTS',
        retryAfter: retryAfterSec
      });
      return;
    }

    // 2. Validação por Identificador de Conta (se aplicável)
    let identifier: string | undefined;
    if (options.extractIdentifier) {
      identifier = options.extractIdentifier(req);
    } else if (req.body) {
      identifier = req.body.identifier || req.body.email || req.body.cpf;
    }

    const cleanId = normalizeIdentifier(identifier);
    let accountKey: string | null = null;

    if (cleanId && options.accountMax && options.accountWindowSeconds) {
      accountKey = `rl:acct:${options.actionName}:${cleanId}`;
      const accountResult = await consumeRateLimit(
        accountKey,
        options.accountMax,
        options.accountWindowSeconds
      );

      if (accountResult.isBlocked) {
        const retryAfterSec = Math.max(1, Math.ceil((accountResult.resetTimeMs - Date.now()) / 1000));
        const retryMin = Math.ceil(retryAfterSec / 60);

        // Registra evento de auditoria com identificador mascarado
        console.warn(
          `🚨 [SEGURANÇA / RATE-LIMIT] Limite por Conta excedido na ação "${options.actionName}". Conta: ${maskIdentifier(cleanId)}, IP: ${maskIp(ip)}, Aguardar: ${retryAfterSec}s`
        );

        res.set({
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Limit': String(options.accountMax),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(accountResult.resetTimeMs / 1000))
        });

        // Resposta sem expor se a conta existe ou não
        res.status(429).json({
          error: `Muitas tentativas para esta conta. Por motivos de segurança, o acesso temporário foi bloqueado. Tente novamente em ${retryMin} minuto(s).`,
          code: 'TOO_MANY_REQUESTS',
          retryAfter: retryAfterSec
        });
        return;
      }
    }

    // Define headers informativos na resposta permitida
    res.set({
      'X-RateLimit-Limit': String(options.ipMax),
      'X-RateLimit-Remaining': String(ipResult.remainingPoints),
      'X-RateLimit-Reset': String(Math.ceil(ipResult.resetTimeMs / 1000))
    });

    // Helper anexado à requisição para permitir reset ao ter sucesso
    (req as any).resetAuthRateLimit = async () => {
      await resetRateLimitKey(ipKey);
      if (accountKey) {
        await resetRateLimitKey(accountKey);
      }
    };

    next();
  };
}

// Configurações padrão carregadas de variáveis de ambiente com defaults seguros
export const loginRateLimiter = createRateLimiterMiddleware({
  actionName: 'login',
  actionLabel: 'login',
  ipMax: parseInt(process.env.RATE_LIMIT_LOGIN_IP_MAX || '10', 10), // 10 tentativas por IP em 5 min
  ipWindowSeconds: parseInt(process.env.RATE_LIMIT_LOGIN_IP_WINDOW_SEC || '300', 10),
  accountMax: parseInt(process.env.RATE_LIMIT_LOGIN_ACCOUNT_MAX || '5', 10), // 5 tentativas por conta em 10 min
  accountWindowSeconds: parseInt(process.env.RATE_LIMIT_LOGIN_ACCOUNT_WINDOW_SEC || '600', 10)
});

export const registerRateLimiter = createRateLimiterMiddleware({
  actionName: 'register',
  actionLabel: 'cadastro',
  ipMax: parseInt(process.env.RATE_LIMIT_REGISTER_IP_MAX || '5', 10), // 5 cadastros por IP em 10 min
  ipWindowSeconds: parseInt(process.env.RATE_LIMIT_REGISTER_IP_WINDOW_SEC || '600', 10)
});

export const forgotPasswordRateLimiter = createRateLimiterMiddleware({
  actionName: 'forgot_password',
  actionLabel: 'recuperação de senha',
  ipMax: parseInt(process.env.RATE_LIMIT_FORGOT_PASS_IP_MAX || '5', 10), // 5 pedidos por IP em 10 min
  ipWindowSeconds: parseInt(process.env.RATE_LIMIT_FORGOT_PASS_IP_WINDOW_SEC || '600', 10),
  accountMax: parseInt(process.env.RATE_LIMIT_FORGOT_PASS_ACCOUNT_MAX || '3', 10), // 3 pedidos por e-mail em 10 min
  accountWindowSeconds: parseInt(process.env.RATE_LIMIT_FORGOT_PASS_ACCOUNT_WINDOW_SEC || '600', 10)
});

export const resetPasswordRateLimiter = createRateLimiterMiddleware({
  actionName: 'reset_password',
  actionLabel: 'redefinição de senha',
  ipMax: parseInt(process.env.RATE_LIMIT_RESET_PASS_IP_MAX || '8', 10), // 8 tentativas de código por IP em 10 min
  ipWindowSeconds: parseInt(process.env.RATE_LIMIT_RESET_PASS_IP_WINDOW_SEC || '600', 10),
  accountMax: parseInt(process.env.RATE_LIMIT_RESET_PASS_ACCOUNT_MAX || '5', 10), // 5 tentativas por e-mail em 10 min
  accountWindowSeconds: parseInt(process.env.RATE_LIMIT_RESET_PASS_ACCOUNT_WINDOW_SEC || '600', 10)
});

export const googleAuthRateLimiter = createRateLimiterMiddleware({
  actionName: 'google_auth',
  actionLabel: 'login social',
  ipMax: parseInt(process.env.RATE_LIMIT_GOOGLE_IP_MAX || '10', 10),
  ipWindowSeconds: parseInt(process.env.RATE_LIMIT_GOOGLE_IP_WINDOW_SEC || '300', 10)
});
