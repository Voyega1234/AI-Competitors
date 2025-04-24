export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

export type ErrorWithMessage = Error & {
  message: string;
  code?: string;
}; 