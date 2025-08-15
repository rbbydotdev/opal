// export async function ConcurrentWorkers<
//   I extends Iterable<unknown> | ArrayLike<unknown>,
//   T = I extends Iterable<infer U> ? U : I extends ArrayLike<infer V> ? V : never,
//   R = unknown
// >(

export async function ConcurrentWorkers<
  TArg,
  TResource,
  TExecReturn,
  TExec extends (r: TResource, i: TArg) => Promise<TExecReturn>,
>(
  build: () => TResource,
  exec: TExec,
  items: Iterable<TArg> | ArrayLike<TArg>,
  concurrency = 8
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
    }
  };

  await Promise.all(queue.map((file) => runWorker(file)));
  return results;
}

// async function main() {
//   // const docx =

//   const results = await ConcurrentWorkers(
//     () => Comlink.wrap<DocxConvertType>(new Worker("/docx.ww.js")),
//     (worker, item) => worker(item),
//     [],
//     8
//   );
// }
