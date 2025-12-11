export async function ConcurrentWorkers<TArg, TResource, TExecReturn>(
  build: () => TResource,
  exec: (r: TResource, i: TArg) => Promise<TExecReturn>,
  items: Iterable<TArg> | ArrayLike<TArg>,
  concurrency = 8,
  tearDown: (r: TResource) => void = () => {}
): Promise<TExecReturn[]> {
  const queue: TArg[] = [];
  const filesArr = Array.from(items);

  while (queue.length < concurrency && filesArr.length) {
    queue.push(filesArr.pop()!);
  }

  const results: TExecReturn[] = [];

  const runWorker = async (item: TArg, resource = build()) => {
    results.push(await exec(resource, item));
    if (filesArr.length) {
      return runWorker(filesArr.pop()!, resource);
    } else {
      tearDown(resource);
    }
  };

  await Promise.all(queue.map((file) => runWorker(file)));
  return results;
}
