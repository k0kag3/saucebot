import Discord from "discord.js";
import debug from "debug";
import { SilentError } from "./errors";

export const log = debug("saucebot");

export async function assertPermission(
  message: Discord.Message,
  permission: Discord.PermissionString = "MANAGE_CHANNELS"
) {
  if (message.channel.type !== "text") {
    throw new SilentError(`Only active in text channel`);
  }

  const hasPermisson = message.channel
    .permissionsFor(message.author)
    ?.has(permission);

  if (!hasPermisson) {
    throw new Error("You don't have enough permission.");
  }
}
