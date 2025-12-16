import * as Comlink from "comlink";

export class MyClass {
  _counter = 0;
  constructor(init = 0) {
    console.log(init);
    this._counter = init;
  }

  get counter() {
    return this._counter;
  }

  increment(delta = 1) {
    this._counter += delta;
  }
}

Comlink.expose(MyClass);
