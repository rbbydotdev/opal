import React from 'react';
import { WorkerPoolProvider, useWorkerPool } from './index';

// Define your worker API interface
interface MyWorkerAPI {
  doTheThing: (input: string) => Promise<string>;
  processData: (data: any[]) => Promise<any[]>;
  heavyComputation: (iterations: number) => Promise<number>;
}

// Usage example
function ExampleComponent() {
  // Now cmd is properly typed as Remote<MyWorkerAPI>
  const { cmd } = useWorkerPool<MyWorkerAPI>("my-worker");

  const handleClick = async () => {
    // TypeScript will provide autocomplete and type checking here
    const result = await cmd.doTheThing("foobar");
    console.log(result); // result is typed as string

    const data = await cmd.processData([{ id: 1 }, { id: 2 }]);
    console.log(data); // data is typed as any[]

    const computation = await cmd.heavyComputation(1000);
    console.log(computation); // computation is typed as number
  };

  return (
    <button onClick={handleClick}>
      Run Worker Commands
    </button>
  );
}

// App setup with typed provider
function App() {
  return (
    <WorkerPoolProvider<MyWorkerAPI> 
      id="my-worker" 
      src="/src/features/worker-pool/example-worker.ts" 
      count={5}
    >
      <ExampleComponent />
    </WorkerPoolProvider>
  );
}