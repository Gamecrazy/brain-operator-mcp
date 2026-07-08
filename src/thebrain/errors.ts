import { sanitizeError } from "../safety/sanitize.js";

export class TheBrainApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly method: string,
    public readonly path: string
  ) {
    super(sanitizeError(new Error(message)).message);
    this.name = "TheBrainApiError";
  }
}
