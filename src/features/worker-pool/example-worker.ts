import { exposeWorkerAPI } from './utils';

interface WorkerAPI {
  doTheThing: (input: string) => Promise<string>;
  processData: (data: any[]) => Promise<any[]>;
  heavyComputation: (iterations: number) => Promise<number>;
}

const workerAPI: WorkerAPI = {
  async doTheThing(input: string): Promise<string> {
    // Simulate some async work
    await new Promise(resolve => setTimeout(resolve, 100));
    return `Processed: ${input}`;
  },

  async processData(data: any[]): Promise<any[]> {
    // Simulate data processing
    await new Promise(resolve => setTimeout(resolve, 50));
    return data.map(item => ({ ...item, processed: true }));
  },

  async heavyComputation(iterations: number): Promise<number> {
    let result = 0;
    for (let i = 0; i < iterations; i++) {
      result += Math.sqrt(i);
    }
    return result;
  }
};

exposeWorkerAPI(workerAPI);