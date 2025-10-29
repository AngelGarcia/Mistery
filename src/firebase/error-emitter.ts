import { EventEmitter } from "events";
import { FirestorePermissionError } from "./errors";

type Events = {
  "permission-error": (error: FirestorePermissionError) => void;
};

// This is a workaround for the fact that the EventEmitter class is not correctly typed
interface TypedEventEmitter<TEvents extends Record<string, any>> {
  on<TEvent extends keyof TEvents>(
    event: TEvent,
    listener: TEvents[TEvent]
  ): this;
  off<TEvent extends keyof TEvents>(
    event: TEvent,
    listener: TEvents[TEvent]
  ): this;
  emit<TEvent extends keyof TEvents>(
    event: TEvent,
    ...args: Parameters<TEvents[TEvent]>
  ): boolean;
}

// We use a singleton pattern to ensure that the same instance of the EventEmitter is used throughout the app.
class ErrorEventEmitter extends (EventEmitter as any as {
  new <TEvents extends Record<string, any>>(): TypedEventEmitter<TEvents>;
})<Events> {}

export const errorEmitter = new ErrorEventEmitter<Events>();

    