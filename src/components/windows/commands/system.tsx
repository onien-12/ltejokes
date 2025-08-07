import { CommandHandler } from "./types";

export const unameCommand: CommandHandler = (
  args,
  { currentPath, addOutput }
) => {
  addOutput(
    `Postix rdr 0.1.0-1-dev #1 SMP PREEMPT_DYNAMIC ${new Date().toUTCString()} UTC`
  );
};
