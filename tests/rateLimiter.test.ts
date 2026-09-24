import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  consumeRateLimit,
  resetRateLimitKey,
  normalizeIdentifier,
  maskIdentifier,
  maskIp,
  createRateLimiterMiddleware
} from '../server/rateLimiter.js';
import type { Request, Response } from 'express';

describe('🛡️ Testes de Segurança: Rate Limiting Anti-Brute Force', () => {

  beforeEach(async () => {
    // Reseta chaves de teste
    await resetRateLimitKey('rl:test:ip:127.0.0.1');
    await resetRateLimitKey('rl:test:ip:192.168.1.100');
    await resetRateLimitKey('rl:test:ip:10.0.0.50');
    await resetRateLimitKey('rl:test:acct:vitima@email.com');
    await resetRateLimitKey('rl:test:acct:12345678900');
  });

  test('1. Requisições dentro do limite permitido devem ser autorizadas', async () => {
    const key = 'rl:test:ip:127.0.0.1';
    const maxPoints = 3;
    const windowSec = 2; // 2 segundos

    const r1 = await consumeRateLimit(key, maxPoints, windowSec);
    assert.equal(r1.isBlocked, false, 'Primeira tentativa deve ser permitida');
    assert.equal(r1.points, 1);
    assert.equal(r1.remainingPoints, 2);

    const r2 = await consumeRateLimit(key, maxPoints, windowSec);
    assert.equal(r2.isBlocked, false, 'Segunda tentativa deve ser permitida');
    assert.equal(r2.points, 2);
    assert.equal(r2.remainingPoints, 1);

    const r3 = await consumeRateLimit(key, maxPoints, windowSec);
    assert.equal(r3.isBlocked, false, 'Terceira tentativa (no limite) deve ser permitida');
    assert.equal(r3.points, 3);
    assert.equal(r3.remainingPoints, 0);
  });

  test('2. Tentativa que exceder o limite deve ser bloqueada (isBlocked = true)', async () => {
    const key = 'rl:test:ip:127.0.0.1';
    const maxPoints = 2;
    const windowSec = 5;

    await consumeRateLimit(key, maxPoints, windowSec); // 1
    await consumeRateLimit(key, maxPoints, windowSec); // 2
    
    // 3ª tentativa excede o limite de 2
    const r3 = await consumeRateLimit(key, maxPoints, windowSec);
    assert.equal(r3.isBlocked, true, 'Tentativa além do limite deve ser bloqueada');
    assert.equal(r3.points, 3);
    assert.equal(r3.remainingPoints, 0);
    assert.ok(r3.resetTimeMs > Date.now(), 'Reset time deve estar no futuro');
  });

  test('3. Expiração da janela: após o tempo limite, os pontos devem reiniciar', async () => {
    const key = 'rl:test:ip:10.0.0.50';
    const maxPoints = 1;
    const windowSec = 1; // 1 segundo para teste rápido

    const r1 = await consumeRateLimit(key, maxPoints, windowSec);
    assert.equal(r1.isBlocked, false);

    const r2 = await consumeRateLimit(key, maxPoints, windowSec);
    assert.equal(r2.isBlocked, true, 'Bloqueado no mesmo segundo');

    // Aguarda expiração da janela (1.1s)
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const r3 = await consumeRateLimit(key, maxPoints, windowSec);
    assert.equal(r3.isBlocked, false, 'Após a janela de expiração, a requisição deve ser permitida novamente');
    assert.equal(r3.points, 1);
  });

  test('4. Proteção por Conta: Ataque distribuído com múltiplos IPs contra o mesmo e-mail deve ser bloqueado', async () => {
    const targetAccount = 'vitima@email.com';
    const accountKey = `rl:test:acct:${targetAccount}`;
    const accountMax = 3;
    const windowSec = 10;

    // IP 1 tenta atacar
    await consumeRateLimit(accountKey, accountMax, windowSec);
    // IP 2 tenta atacar a mesma conta
    await consumeRateLimit(accountKey, accountMax, windowSec);
    // IP 3 tenta atacar a mesma conta
    await consumeRateLimit(accountKey, accountMax, windowSec);

    // IP 4 tenta atacar a mesma conta -> Excede o limite por conta
    const r4 = await consumeRateLimit(accountKey, accountMax, windowSec);
    assert.equal(r4.isBlocked, true, 'Ataque distribuído por múltiplos IPs contra a mesma conta deve ser contido');
  });

  test('5. Mascaramento e Normalização Segura de Identificadores e IPs', () => {
    // Normalização
    assert.equal(normalizeIdentifier('  Maria.Helena@Email.COM '), 'maria.helena@email.com');
    assert.equal(normalizeIdentifier(' 123.456.789-00 '), '12345678900');
    assert.equal(normalizeIdentifier(' ADMIN '), 'admin');

    // Mascaramento nos logs (sem expor PII completo)
    assert.equal(maskIdentifier('leandro@empresa.com.br'), 'l***o@empresa.com.br');
    assert.equal(maskIdentifier('123.456.789-00'), '123.***.***-00');
    assert.equal(maskIp('189.45.120.88'), '189.45.***.***');
  });

  test('6. Middleware Express: Retorna HTTP 429 Too Many Requests com headers RFC padrão', async () => {
    const middleware = createRateLimiterMiddleware({
      actionName: 'test_middleware',
      actionLabel: 'teste',
      ipMax: 2,
      ipWindowSeconds: 5,
      accountMax: 2,
      accountWindowSeconds: 5
    });

    const createMockReqRes = (ip: string, email?: string) => {
      const headers: Record<string, string> = { 'x-forwarded-for': ip };
      const req: Partial<Request> = {
        headers,
        body: { email }
      } as any;

      let statusCode = 200;
      let responseBody: any = null;
      const setHeaders: Record<string, string> = {};

      const res: Partial<Response> = {
        set(headerObj: any) {
          Object.assign(setHeaders, headerObj);
          return this as any;
        },
        status(code: number) {
          statusCode = code;
          return this as any;
        },
        json(data: any) {
          responseBody = data;
          return this as any;
        }
      };

      let nextCalled = false;
      const next = () => { nextCalled = true; };

      return { req: req as Request, res: res as Response, getStatus: () => statusCode, getBody: () => responseBody, getHeaders: () => setHeaders, wasNextCalled: () => nextCalled };
    };

    // Chamada 1
    const mock1 = createMockReqRes('192.168.1.100', 'teste@farmacia.com');
    await middleware(mock1.req, mock1.res, mock1.wasNextCalled as any);
    assert.equal(mock1.getStatus(), 200);

    // Chamada 2
    const mock2 = createMockReqRes('192.168.1.100', 'teste@farmacia.com');
    await middleware(mock2.req, mock2.res, mock2.wasNextCalled as any);
    assert.equal(mock2.getStatus(), 200);

    // Chamada 3: Excede o limite
    const mock3 = createMockReqRes('192.168.1.100', 'teste@farmacia.com');
    await middleware(mock3.req, mock3.res, mock3.wasNextCalled as any);
    
    assert.equal(mock3.getStatus(), 429, 'Status HTTP deve ser 429 Too Many Requests');
    assert.equal(mock3.getBody().code, 'TOO_MANY_REQUESTS');
    assert.ok(mock3.getHeaders()['Retry-After'], 'Deve enviar o header Retry-After');
    assert.equal(mock3.getHeaders()['X-RateLimit-Remaining'], '0');
  });

  test('7. Prevenção de Enumeração de Contas: Resposta 429 idêntica para contas existentes ou inexistentes', async () => {
    const middleware = createRateLimiterMiddleware({
      actionName: 'test_enum',
      actionLabel: 'login',
      ipMax: 10,
      ipWindowSeconds: 5,
      accountMax: 1,
      accountWindowSeconds: 5
    });

    const createReqRes = (email: string) => {
      const req = { headers: {}, body: { identifier: email } } as Request;
      let statusCode = 200;
      let responseBody: any = null;
      const res = {
        set() { return this; },
        status(code: number) { statusCode = code; return this; },
        json(data: any) { responseBody = data; return this; }
      } as unknown as Response;
      const next = () => {};
      return { req, res, getStatus: () => statusCode, getBody: () => responseBody };
    };

    // Bloqueia conta A (existente)
    const mockExistente1 = createReqRes('conta_existente@email.com');
    await middleware(mockExistente1.req, mockExistente1.res, () => {});
    const mockExistente2 = createReqRes('conta_existente@email.com');
    await middleware(mockExistente2.req, mockExistente2.res, () => {});

    // Bloqueia conta B (inexistente)
    const mockInexistente1 = createReqRes('conta_inexistente@email.com');
    await middleware(mockInexistente1.req, mockInexistente1.res, () => {});
    const mockInexistente2 = createReqRes('conta_inexistente@email.com');
    await middleware(mockInexistente2.req, mockInexistente2.res, () => {});

    assert.equal(mockExistente2.getStatus(), 429);
    assert.equal(mockInexistente2.getStatus(), 429);
    assert.equal(
      mockExistente2.getBody().error,
      mockInexistente2.getBody().error,
      'A mensagem de erro de bloqueio não deve vazar se a conta existe ou não'
    );
  });
});
