import {z} from "zod";

export {z, ZodError} from "zod";
export type {ZodType} from "zod";

export type Schema<T> = {
  parse(value: unknown): T;
};

export function nonEmptyString(message = "Expected a non-empty string") {
  return z.string().trim().min(1, message);
}
