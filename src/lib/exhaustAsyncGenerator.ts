export async function exhaustAsyncGenerator(gen: AsyncGenerator<unknown, unknown, unknown>) {
  for await (const _ of gen) {
  }
}
