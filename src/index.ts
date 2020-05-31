import Discord from 'discord.js';
import assert from 'assert';
import isURL from 'validator/lib/isURL';
import bytes from 'bytes';
import * as ascii2d from 'ascii2d';

import {log} from './util';
import {SilentError} from './errors';

const PREFIX = process.env.SAUCE_BOT_PREFIX || '!sauce';
const EMOJI = process.env.SAUCE_BOT_EMOJI || '🥫';

const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
assert(DISCORD_TOKEN, 'DISCORD_TOKEN is missing');

function verifyImageUrl(url: string): boolean {
  return isURL(url);
  // && /(jpe?g|gif|png|webp|bmp)$/i.test(url)
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

  let imageUrl: string;

  const attachment = reaction.message.attachments.first();
  if (attachment) {
    const {proxyURL, width, height} = attachment;
    const THRESHOLD = 800;
    if (!width || !height || width < THRESHOLD) {
      imageUrl = proxyURL;
    } else {
      const ratio = height / width;
      const newWidth = THRESHOLD;
      const newHeight = Math.floor(newWidth * ratio);
      imageUrl = proxyURL + `?width=${newWidth}&height=${newHeight}`;
    }
  } else {
    const url = reaction.message.content.trim();
    if (!verifyImageUrl(url)) return;
    imageUrl = url;
  }

  log(imageUrl);

  const result = await ascii2d.searchByUrl(imageUrl);
  log(result.url);

  const item = result.items[0];
  const embed = new Discord.MessageEmbed();
  embed.setColor('#FA7268');
  embed.setThumbnail(item.thumbnailUrl);
  embed.setFooter(
    'Guessed by SauceBot',
    'https://raw.githubusercontent.com/k0kag3/saucebot/master/assets/Icon.png',
  );
  if (item.source) {
    embed.addField('Source', item.source.type);
    embed.setTitle(item.source.title);
    embed.setURL(item.source.url);
    if (item.source.author) {
      const {name, url} = item.source.author;
      embed.setAuthor(name, undefined, url);
    }
  } else if (item.externalInfo) {
    const source = item.externalInfo.content;
    if (typeof source !== 'string') {
      embed.addField('Source', source.type);
      embed.setTitle(source.title);
      embed.setURL(source.url);
      if (source.author) {
        const {name, url} = source.author;
        embed.setAuthor(name, undefined, url);
      }
    } else {
      embed.addField('Source', item.externalInfo.ref);
      embed.setDescription(source);
    }
  } else {
    embed.addField('Source', 'Unavailable');
  }
  embed.addFields([
    // {
    //   name: 'Dimention',
    //   value: `${item.width}x${item.height}`,
    //   inline: true,
    // },
    // {
    //   name: 'Size',
    //   value: bytes(item.fileSize),
    //   inline: true,
    // },
    // {
    //   name: 'Kind',
    //   value: item.fileType,
    //   inline: true,
    // },
    {
      name: 'All Result',
      value: `[ascii2d.net](${result.url})`,
      inline: true,
    },
  ]);
  await reaction.message.channel.send([`Use the sauce, ${user}`, embed.url]);
  await reaction.message.channel.send(embed);
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
    await reaction.message.channel.send(`${user} ${err.message}`);
  }
});

process.on('unhandledRejection', (error) =>
  log('Uncaught Promise Rejection', error),
);

client.login(DISCORD_TOKEN);
