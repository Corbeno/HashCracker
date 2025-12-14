import fs from 'fs/promises';
import path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private logDir: string;
  private logFile: string;
  private debugMode: boolean;

  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'hash-cracker.log');
    this.debugMode = process.env.DEBUG === 'true';
    this.init();
  }

  private async init() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(level: LogLevel, message: string, data?: any): string {
    const timestamp = this.getTimestamp();
    const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${dataStr}\n`;
  }

  private async writeToFile(message: string) {
    try {
      await fs.appendFile(this.logFile, message);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  async debug(message: string, data?: any) {
    if (!this.debugMode) return;
    const formattedMessage = this.formatMessage('debug', message, data);
    console.debug(formattedMessage);
    await this.writeToFile(formattedMessage);
  }

  async info(message: string, data?: any) {
    const formattedMessage = this.formatMessage('info', message, data);
    console.info(formattedMessage);
    await this.writeToFile(formattedMessage);
  }

  async warn(message: string, data?: any) {
    const formattedMessage = this.formatMessage('warn', message, data);
    console.warn(formattedMessage);
    await this.writeToFile(formattedMessage);
  }

  async error(message: string, error?: any) {
    const errorData =
      error instanceof Error
        ? {
            ...error,
            stack: error.stack,
            message: error.message,
          }
        : error;

    const formattedMessage = this.formatMessage('error', message, errorData);
    console.error(formattedMessage);
    await this.writeToFile(formattedMessage);
  }

  async getLogContent(lastLines: number = 100): Promise<string> {
    try {
      const content = await fs.readFile(this.logFile, 'utf-8');
      const lines = content.split('\n');
      return lines.slice(-lastLines).join('\n');
    } catch {
      return 'No logs available';
    }
  }
}

export const logger = new Logger();
