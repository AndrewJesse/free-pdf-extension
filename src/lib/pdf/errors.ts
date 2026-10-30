export class PdfToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PdfToolError';
  }
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof PdfToolError) return error.message;
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.length > 0 && message.length < 180 && !message.includes('\n')) {
      return message;
    }
  }
  return fallback;
}
