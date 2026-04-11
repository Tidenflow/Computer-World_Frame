import { describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import { validateProgressBody } from '../backend/src/middleware/validate.middleware';

function createResponseMock(): Response {
  const response = {
    status: vi.fn(),
    json: vi.fn()
  } as unknown as Response;

  vi.mocked(response.status).mockReturnValue(response);
  return response;
}

describe('validateProgressBody', () => {
  it('accepts the document-based unlocked payload', () => {
    const req = {
      body: {
        mapId: 'computer-world',
        mapVersion: '2026-04-11',
        unlocked: {
          'cpu-basics': { unlockedAt: 1712800000000 }
        }
      }
    } as Request;
    const res = createResponseMock();
    const next = vi.fn() as NextFunction;

    validateProgressBody(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects a missing unlocked object', () => {
    const req = {
      body: {
        mapId: 'computer-world',
        mapVersion: '2026-04-11'
      }
    } as Request;
    const res = createResponseMock();
    const next = vi.fn() as NextFunction;

    validateProgressBody(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});
