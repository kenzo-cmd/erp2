import { NextResponse } from "next/server";

/**
 * Every route handler returns the same shape: { success, data, message }.
 *
 * A caller should never have to guess what a response looks like based on
 * whether it worked. One shape, always.
 */
export type ApiBody<T> = {
  success: boolean;
  data: T | null;
  message: string;
};

export function ok<T>(data: T, message = "OK", status = 200) {
  return NextResponse.json<ApiBody<T>>({ success: true, data, message }, { status });
}

export function created<T>(data: T, message = "Created") {
  return ok(data, message, 201);
}

/**
 * 4xx means the CALLER did something wrong. 5xx means WE did.
 *
 * Returning 500 for a missing field blames the user for our missing check,
 * and sends you hunting for a server bug that does not exist.
 */
export function badRequest(message: string) {
  return NextResponse.json<ApiBody<never>>(
    { success: false, data: null, message },
    { status: 400 },
  );
}

export function unauthorized(message = "You must be signed in.") {
  return NextResponse.json<ApiBody<never>>(
    { success: false, data: null, message },
    { status: 401 },
  );
}

export function serverError(message = "Something went wrong on our end.") {
  return NextResponse.json<ApiBody<never>>(
    { success: false, data: null, message },
    { status: 500 },
  );
}
