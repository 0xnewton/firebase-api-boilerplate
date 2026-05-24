import * as firebaseLogger from "firebase-functions/logger";
import type {LogSeverity} from "firebase-functions/logger";

import type {RequestContext} from "@app/backend-framework";

export type LogMetadata = Record<string, unknown>;

export type StructuredLogEntry = LogMetadata & {
  severity: LogSeverity;
  message: string;
};

export class Logger {
  constructor(private readonly context: RequestContext) {}

  debug(message: string, metadata: LogMetadata = {}): void {
    this.write("DEBUG", message, metadata);
  }

  info(message: string, metadata: LogMetadata = {}): void {
    this.write("INFO", message, metadata);
  }

  notice(message: string, metadata: LogMetadata = {}): void {
    this.write("NOTICE", message, metadata);
  }

  warn(message: string, metadata: LogMetadata = {}): void {
    this.write("WARNING", message, metadata);
  }

  error(message: string, metadata: LogMetadata = {}): void {
    this.write("ERROR", message, metadata);
  }

  exception(
    message: string,
    error: unknown,
    metadata: LogMetadata = {}
  ): void {
    firebaseLogger.write(this.createExceptionEntry(message, error, metadata));
  }

  createExceptionEntry(
    message: string,
    error: unknown,
    metadata: LogMetadata = {}
  ): StructuredLogEntry {
    return this.createEntry("ERROR", message, {
      ...metadata,
      error: serializeError(error),
    });
  }

  write(
    severity: LogSeverity,
    message: string,
    metadata: LogMetadata = {}
  ): void {
    firebaseLogger.write(this.createEntry(severity, message, metadata));
  }

  createEntry(
    severity: LogSeverity,
    message: string,
    metadata: LogMetadata = {}
  ): StructuredLogEntry {
    return {
      ...metadata,
      severity,
      message,
      context: {
        serviceName: this.context.serviceName,
        stage: this.context.stage,
        requestId: this.context.requestId,
        method: this.context.request.method,
        path: this.context.request.path,
      },
    };
  }
}

function serializeError(error: unknown): LogMetadata {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    value: error,
  };
}
