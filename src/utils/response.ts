import { Response } from 'express';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface PaginationMeta {
  limit: number;
  offset: number;
  total: number;
}

export interface ApiListResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200): void {
  const body: ApiSuccessResponse<T> = { success: true, data };
  res.status(statusCode).json(body);
}

export function sendList<T>(
  res: Response,
  data: T[],
  pagination: PaginationMeta,
  statusCode = 200
): void {
  const body: ApiListResponse<T> = { success: true, data, pagination };
  res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string
): void {
  const body: ApiErrorResponse = { success: false, error: { code, message } };
  res.status(statusCode).json(body);
}
