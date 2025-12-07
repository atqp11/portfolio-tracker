// lib/utils/apiErrorClassifier.ts
// Utility for classifying different types of API errors

export type ApiErrorType = 'rate_limit' | 'auth' | 'network' | 'server' | 'unknown';

export interface ApiError {
  type: ApiErrorType;
  message: string;
}

export function classifyApiError(error: unknown): ApiError {
  // Safely extract error message from unknown type
  let errorMessage = '';
  
  if (error instanceof Error) {
    errorMessage = error.message;
  } else if (typeof error === 'object' && error !== null && 'message' in error) {
    const messageValue = (error as { message?: unknown }).message;
    errorMessage = typeof messageValue === 'string' ? messageValue : String(messageValue ?? '');
  } else if (error !== null && error !== undefined) {
    errorMessage = String(error);
  }
  
  // Check for rate limit errors
  if (
    errorMessage.includes('RATE_LIMIT') ||
    errorMessage.includes('rate limit') ||
    errorMessage.includes('Too Many Requests') ||
    errorMessage.includes('429')
  ) {
    return {
      type: 'rate_limit',
      message: errorMessage,
    };
  }
  
  // Check for authentication errors
  if (
    errorMessage.includes('auth') ||
    errorMessage.includes('unauthorized') ||
    errorMessage.includes('invalid api key') ||
    errorMessage.includes('401') ||
    errorMessage.includes('403')
  ) {
    return {
      type: 'auth',
      message: errorMessage,
    };
  }
  
  // Check for network errors
  if (
    errorMessage.includes('network') ||
    errorMessage.includes('ENOTFOUND') ||
    errorMessage.includes('ECONNREFUSED') ||
    errorMessage.includes('timeout')
  ) {
    return {
      type: 'network',
      message: errorMessage,
    };
  }
  
  // Check for server errors
  if (
    errorMessage.includes('500') ||
    errorMessage.includes('502') ||
    errorMessage.includes('503') ||
    errorMessage.includes('server error')
  ) {
    return {
      type: 'server',
      message: errorMessage,
    };
  }
  
  return {
    type: 'unknown',
    message: errorMessage,
  };
}
