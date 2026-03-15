import { InputState } from "../../physics/scenes/types";

export interface ForkliftCommandState {
  drive: number;
  lift: number;
  tilt: number;
  boost: boolean;
}

export function readForkliftCommands(input: InputState): ForkliftCommandState {
  return {
    drive: (input.right ? 1 : 0) - (input.left ? 1 : 0),
    lift: (input.liftUp ? 1 : 0) - (input.liftDown ? 1 : 0),
    tilt: (input.tiltUp ? 1 : 0) - (input.tiltDown ? 1 : 0),
    boost: input.boost,
  };
}
