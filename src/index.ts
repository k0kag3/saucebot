import Discord from 'discord.js';
import assert from 'assert';
import isURL from 'validator/lib/isURL';
import * as ascii2d from 'ascii2d';

import {log} from './util';
import {SilentError} from './errors';

const PREFIX = process.env.SAUCE_BOT_PREFIX || '!sauce';
const EMOJI = process.env.SAUCE_BOT_EMOJI || '🥫';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
assert(DISCORD_TOKEN, 'DISCORD_TOKEN is missing');

function verifyImageUrl(url: string): boolean {
  return isURL(url) && /(jpe?g|gif|png|webp|bmp)$/i.test(url);
}

function generateMessageLink(message: Discord.Message) {
  if (!message.guild) throw new Error(`guildId missing`);
  return `https://discord.com/channels/${message.guild.id}/${message.channel.id}/${message.id}`;
}

async function onMessage(message: Discord.Message) {
  if (message.content === PREFIX) {
    message.react('🥫');
  }
}

async function onMessageReactionAdd(
  reaction: Discord.MessageReaction,
  user: Discord.User | Discord.PartialUser,
) {
  // When we receive a reaction we check if the reaction is partial or not
  if (reaction.partial) {
    // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
    try {
      await reaction.fetch();
    } catch (error) {
      console.log('Something went wrong when fetching the message: ', error);
      // Return as `reaction.message.author` may be undefined/null
      return;
    }
  }

  if (user.bot || reaction.me || reaction.emoji.name !== EMOJI) return;
  const imageUrl =
    reaction.message.attachments.first()?.url ||
    reaction.message.content.trim();
  log(imageUrl);
  if (!verifyImageUrl(imageUrl)) return;

  const result = await ascii2d.searchByUrl(imageUrl);
  log(result.url);

  const item = result.items[0];
  const message = ['✏️ ' + generateMessageLink(reaction.message)];
  switch (typeof item.source) {
    case 'string':
      await reaction.message.channel.send([...message, '🥫 ' + item.source]);
      break;
    case 'object':
      await reaction.message.channel.send([
        ...message,
        '🥫 ' + item.source.url,
      ]);
      break;
    default:
      await reaction.message.channel.send([...message, '🥫 ' + result.url]);
  }
}

const client = new Discord.Client();

client.once('ready', () => {
  log('ready');
  log('PREFIX', PREFIX);
  log('EMOJI', EMOJI);
});

client.on('message', async (message) => {
  try {
    await onMessage(message);
  } catch (err) {
    log(err);
    if (err instanceof SilentError) return;
    await message.reply(err.message);
  }
});

client.on('messageReactionAdd', async (reaction, user) => {
  try {
    await onMessageReactionAdd(reaction, user);
  } catch (err) {
    log(err);
    if (err instanceof SilentError) return;
    await reaction.message.reply(err.message);
  }
});

process.on('unhandledRejection', (error) =>
  log('Uncaught Promise Rejection', error),
);

client.login(DISCORD_TOKEN);
