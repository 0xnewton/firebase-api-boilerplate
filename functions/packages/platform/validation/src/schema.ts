export type ValidationIssue = {
  path: string;
  message: string;
};

export class ParseError extends Error {
  constructor(readonly issues: ValidationIssue[]) {
    super("Validation failed");
  }
}

export type Schema<T> = {
  parse(value: unknown): T;
};

export type Shape = Record<string, Schema<unknown>>;

export type InferShape<TShape extends Shape> = {
  [Key in keyof TShape]: TShape[Key] extends Schema<infer TValue> ?
    TValue :
    never;
};

export function string(): Schema<string> {
  return {
    parse(value) {
      if (typeof value !== "string" || value.trim() === "") {
        throw new ParseError([{
          path: "",
          message: "Expected a non-empty string",
        }]);
      }

      return value;
    },
  };
}

export function optional<T>(schema: Schema<T>): Schema<T | undefined> {
  return {
    parse(value) {
      if (value === undefined || value === null) {
        return undefined;
      }

      return schema.parse(value);
    },
  };
}

export function object<TShape extends Shape>(
  shape: TShape
): Schema<InferShape<TShape>> {
  return {
    parse(value) {
      if (!isRecord(value)) {
        throw new ParseError([{
          path: "",
          message: "Expected an object",
        }]);
      }

      const issues: ValidationIssue[] = [];
      const parsed: Partial<InferShape<TShape>> = {};

      for (const key of Object.keys(shape) as Array<keyof TShape>) {
        try {
          parsed[key] = shape[key].parse(value[String(key)]) as
            InferShape<TShape>[typeof key];
        } catch (error) {
          issues.push(...prefixIssues(String(key), error));
        }
      }

      if (issues.length) {
        throw new ParseError(issues);
      }

      return parsed as InferShape<TShape>;
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function prefixIssues(path: string, error: unknown): ValidationIssue[] {
  if (error instanceof ParseError) {
    return error.issues.map((issue) => ({
      path: issue.path ? `${path}.${issue.path}` : path,
      message: issue.message,
    }));
  }

  if (error instanceof Error) {
    return [{
      path,
      message: error.message,
    }];
  }

  return [{
    path,
    message: String(error),
  }];
}
