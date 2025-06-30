/**
 * A helper async generator that wraps another async generator and
 * aborts iteration when the signal is triggered.
 */
export async function* wrapGeneratorWithSignal<T>(
  generator: AsyncGenerator<T>,
  signal: AbortSignal
): AsyncGenerator<T> {
  // Throws an 'AbortError' if the signal is already aborted.
  signal.throwIfAborted();

  while (true) {
    // Race the generator's next value against the signal's abort event.
    const nextPromise = generator.next();
    const abortPromise = new Promise<never>((_, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });
    });

    const result = await Promise.race([nextPromise, abortPromise]);

    if (result.done) {
      return; // The generator finished.
    }
    yield result.value;
  }
}
