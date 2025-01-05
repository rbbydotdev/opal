import Emittery, { type Options } from "emittery";
import { nanoid } from "nanoid";

interface EmitOptions {
  self?: boolean;
}

export class ChannelEmittery<EventData = Record<string, any>> extends Emittery<EventData> {
  private channel: BroadcastChannel;

  constructor(public readonly channelName: string, options?: Options<EventData>) {
    super(options);
    this.channel = new BroadcastChannel(channelName);

    this.channel.onmessage = (event) => {
      const { eventName, eventData } = event.data;
      if (eventName === undefined) return;
      super.emit(eventName, eventData);
    };
  }

  async emit<Name extends keyof EventData>(
    eventName: Name,
    eventData?: EventData[Name] | EmitOptions,
    options: EmitOptions = { self: false }
  ): Promise<void> {
    //check if eventData is an EmitOptions object

    if (
      typeof eventData === "object" &&
      eventData !== null &&
      !Array.isArray(eventData) &&
      Object.keys(eventData).length === 1 &&
      (eventData as EmitOptions).self !== undefined
    ) {
      options = eventData;
      eventData = undefined;
    }
    if (options.self) {
      await super.emit(eventName, eventData as EventData[Name]);
    }

    // Ensure that eventData is serializable
    const message = JSON.stringify({ eventName, eventData });
    this.channel.postMessage(JSON.parse(message));
  }

  closeChannel() {
    this.channel.close();
  }
  tearDown() {
    this.channel.close();
    this.clearListeners();
  }
}

export class ChannelEmittery2<EventData = Record<string, any>> extends Emittery<EventData> {
  private channel: BroadcastChannel;

  constructor(public readonly channelName: string = nanoid(), options?: Options<EventData>) {
    super(options);
    this.channel = new BroadcastChannel(channelName);

    this.channel.onmessage = (event) => {
      const { eventName, eventData } = event.data;
      if (eventName === undefined) return;
      super.emit(eventName, eventData);
    };
  }

  async emit<Name extends keyof EventData>(
    eventName: Name,
    eventData?: EventData[Name] | EmitOptions,
    options: EmitOptions = { self: false }
  ): Promise<void> {
    // Check if eventData is an EmitOptions object
    if (this.isEmitOptions(eventData)) {
      options = eventData;
      eventData = undefined;
    }

    // Emit to the local instance if 'self' is true
    if (options.self) {
      await super.emit(eventName, eventData as EventData[Name]);
    }

    // Ensure that eventData is serializable
    try {
      const message = JSON.stringify({ eventName, eventData });
      this.channel.postMessage(JSON.parse(message));
    } catch (error) {
      console.error("Failed to serialize event data:", error);
    }
  }

  private isEmitOptions(data: any): data is EmitOptions {
    return typeof data === "object" && data !== null && !Array.isArray(data) && "self" in data;
  }

  closeChannel() {
    this.channel.close();
  }
}
