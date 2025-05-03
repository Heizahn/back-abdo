# back-abdo

This application is generated using [LoopBack 4 CLI](https://loopback.io/doc/en/lb4/Command-line-interface.html) with the
[initial project layout](https://loopback.io/doc/en/lb4/Loopback-application-layout.html).

## Install dependencies

By default, dependencies were installed when this application was generated.
Whenever dependencies in `package.json` are changed, run the following command:

```sh
bun install
```

To only install resolved dependencies in `bun.lockb`:

```sh
bun install --frozen-lockfile
```

## Run the application

```sh
bun start
```

You can also run `node .` to skip the build step.

Open http://127.0.0.1:3000 in your browser.

## Rebuild the project

To incrementally build the project:

```sh
bun run build
```

To force a full build by cleaning up cached artifacts:

```sh
bun run rebuild
```

## Fix code style and formatting issues

```sh
bun run lint
```

To automatically fix such issues:

```sh
bun run lint:fix
```

## Other useful commands

- `bun run migrate`: Migrate database schemas for models
- `bun run openapi-spec`: Generate OpenAPI spec into a file
- `bun run docker:build`: Build a Docker image for this application
- `bun run docker:run`: Run this application inside a Docker container

## Tests

```sh
bun test
```

## What's next

Please check out [LoopBack 4 documentation](https://loopback.io/doc/en/lb4/) to
understand how you can continue to add features to this application.

[![LoopBack](<https://github.com/loopbackio/loopback-next/raw/master/docs/site/imgs/branding/Powered-by-LoopBack-Badge-(blue)-@2x.png>)](http://loopback.io/)
