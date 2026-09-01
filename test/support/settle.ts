/**
 * Run a read to completion under fake timers.
 *
 * The pacing between requests is a timer, so a read only finishes once the
 * clock has been run forward. Its outcome is captured the moment the promise is
 * made, because a promise that rejects while the clock is being advanced has no
 * handler yet at that instant, and the runtime reports it as an unhandled
 * rejection. Attaching the handler first turns a refusal this suite expects into
 * an ordinary value to hand back.
 */

import { vi } from "vitest";

type Outcome<T> = { ok: true; value: T } | { ok: false; error: unknown };

export async function settle<T>(promise: Promise<T>): Promise<T> {
  const outcome: Promise<Outcome<T>> = promise.then(
    (value) => ({ ok: true, value }),
    (error: unknown) => ({ ok: false, error }),
  );

  await vi.runAllTimersAsync();

  const settled = await outcome;
  if (settled.ok) {
    return settled.value;
  }
  throw settled.error;
}
