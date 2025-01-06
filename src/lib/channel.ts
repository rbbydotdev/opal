"use client";
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
      const { eventData, eventName } = event.data;
      if (!eventName) return;
      console.log(eventName);
      super.emit(eventName, eventData);
    };
  }

  async emit<Name extends keyof EventData>(eventName: Name, eventData?: EventData[Name]): Promise<void> {
    //check if eventData is an EmitOptions object
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
