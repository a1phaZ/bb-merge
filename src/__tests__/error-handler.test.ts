import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { errorHandler, AppError } from '../middleware/error-handler';

describe('errorHandler', () => {
  it('handles AppError with status code and message', async () => {
    const app = express();
    app.get('/test', () => {
      throw new AppError(400, 'Bad request');
    });
    app.use(errorHandler);

    const res = await request(app).get('/test');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Bad request');
  });

  it('handles AppError with details', async () => {
    const app = express();
    app.get('/test', () => {
      throw new AppError(422, 'Validation failed', { field: 'name' });
    });
    app.use(errorHandler);

    const res = await request(app).get('/test');
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toEqual({ field: 'name' });
  });

  it('handles unknown errors with 500', async () => {
    const app = express();
    app.get('/test', () => {
      throw new Error('Something went wrong');
    });
    app.use(errorHandler);

    const res = await request(app).get('/test');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});
