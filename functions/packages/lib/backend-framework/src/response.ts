export type ApiResponse<T> = {
  code: string;
  message: string;
  data: T;
};

export function success<T>(
  data: T,
  message = "OK",
  code = "OK"
): ApiResponse<T> {
  return {
    code,
    message,
    data,
  };
}
