export class DisposableWorker extends Worker {
  [Symbol.dispose]() {
    this.terminate();
  }
}
