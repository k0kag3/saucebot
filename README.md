<img width="200" src="https://raw.githubusercontent.com/k0kag3/saucebot/master/assets/Icon.png" alt="Icon" />

# Saucebot

https://twitter.com/k0kag3/status/1266563357831598080

## Bot Usage

### Remove bot from your server

Just kick them.

## Deploy your own bot

Copy `.env.placeholder` to `.env` and put your Discord bot token in it before starting to use the bot.

### Start

```shell
yarn dc:start
```

### Stop

```shell
yarn dc:stop
```

### Update

```shell
yarn dc:update
```

### Show logs

```shell
docker-compose logs -f
```

## Dev

### Launch dev server

```shell
yarn dc:dev
```

### Cleanup

```shell
docker-compose down --rmi local
```
