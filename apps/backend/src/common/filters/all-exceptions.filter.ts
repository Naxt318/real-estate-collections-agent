import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';

export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

interface ClientError {
  status: number;
  message: string;
}

// Gives every error response the same shape. Only HttpExceptions and client errors
// the HTTP layer marks as safe to show (malformed JSON, oversized bodies) reveal
// their message. Anything else becomes a generic 500, and the real error is only logged.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();
    // The query string is left out: it can carry tokens or personal data.
    const [path = ''] = request.originalUrl.split('?');

    const described = this.describe(exception, `${request.method} ${path}`);
    // Nest's unknown-route message is "Cannot GET <url>", which would echo the query string back.
    const message =
      typeof described.message === 'string'
        ? described.message.replace(request.originalUrl, path)
        : described.message;
    const body: ErrorBody = { ...described, message, path, timestamp: new Date().toISOString() };
    response.status(body.statusCode).json(body);
  }

  private describe(exception: unknown, route: string): Omit<ErrorBody, 'path' | 'timestamp'> {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const res = exception.getResponse();
      const fields =
        typeof res === 'object' && res !== null ? (res as Record<string, unknown>) : {};
      const message = isMessage(fields.message) ? fields.message : exception.message;
      const error = typeof fields.error === 'string' ? fields.error : reason(statusCode);
      return { statusCode, error, message };
    }

    if (isExposedClientError(exception)) {
      return {
        statusCode: exception.status,
        error: reason(exception.status),
        message: exception.message,
      };
    }

    const stack = exception instanceof Error ? exception.stack : String(exception);
    this.logger.error(`Unhandled error on ${route}`, stack);
    return { statusCode: 500, error: reason(500), message: 'Internal server error' };
  }
}

function reason(statusCode: number): string {
  return STATUS_CODES[statusCode] ?? 'Error';
}

function isMessage(value: unknown): value is string | string[] {
  return (
    typeof value === 'string' ||
    (Array.isArray(value) && value.every((item) => typeof item === 'string'))
  );
}

// http-errors (used by Express's body parser) sets expose=true only on 4xx errors
// whose message is safe for the client.
function isExposedClientError(exception: unknown): exception is ClientError {
  if (typeof exception !== 'object' || exception === null) return false;
  const e = exception as Record<string, unknown>;
  return (
    e.expose === true &&
    typeof e.status === 'number' &&
    e.status >= 400 &&
    e.status < 500 &&
    typeof e.message === 'string'
  );
}
