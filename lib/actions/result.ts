// The result shape shared by the app's data Server Actions (unit 1.5's updateProfile, unit 2.2's
// transaction actions): `{ data }` on success, `{ error: { code, message, fieldErrors? } }` on failure
// (code-standards.md → API Routes). Each action file keeps its own codes and messages. Holds no secrets
// and imports nothing server-only, so tests and forms can share the types. See
// context/feature-specs/2.2-transaction-create-edit-delete.md, Server Actions.

export type FieldErrors = Record<string, string[] | undefined>;

export interface ActionError<TCode extends string> {
  error: { code: TCode; message: string; fieldErrors?: FieldErrors };
}

export type ActionResult<TData, TCode extends string> = { data: TData } | ActionError<TCode>;

export function failure<TCode extends string>(
  code: TCode,
  message: string,
  fieldErrors?: FieldErrors,
): ActionError<TCode> {
  return { error: fieldErrors ? { code, message, fieldErrors } : { code, message } };
}

// Logs only the error's name and a Prisma error code (such as P1001), never its message, which can
// hold the query, values or connection details. `scope` and `action` are fixed strings from the code.
export function logActionError(scope: string, action: string, error: unknown): void {
  const name = error instanceof Error ? error.name : "UnknownError";
  const raw = (error as { code?: unknown } | null)?.code;
  const code = typeof raw === "string" && /^P\d{4}$/.test(raw) ? raw : "none";
  console.error(`[${scope}] ${action} failed: ${name} (${code})`);
}
