/**
 * Utility functions for handling API error responses
 * 
 * The backend returns errors in the ErrorResponse format:
 * {
 *   success: false,
 *   error: {
 *     code: "ERROR_CODE",
 *     message: "Error message",
 *     timestamp: 1234567890
 *   }
 * }
 * 
 * This utility extracts the message string from the error object.
 */

/**
 * Extract error message from API error response
 * Handles both ErrorResponse format (object with message property) and plain string errors
 * 
 * @param error - The error value from API response (can be object or string)
 * @param fallback - Fallback message if error cannot be extracted
 * @returns The error message as a string
 */
export function extractErrorMessage(error: any, fallback: string = 'An error occurred'): string {
  // If error is already a string, return it
  if (typeof error === 'string') {
    return error;
  }

  // If error is an object with a message property (ErrorResponse format)
  if (typeof error === 'object' && error !== null) {
    // Check for ErrorResponse format: { code, message, timestamp }
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    
    // Check for nested error object: { error: { message: ... } }
    if ('error' in error && typeof error.error === 'object' && error.error !== null) {
      if ('message' in error.error && typeof error.error.message === 'string') {
        return error.error.message;
      }
    }
  }

  // If we can't extract a message, return fallback
  return fallback;
}

