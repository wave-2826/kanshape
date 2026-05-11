# Backend with PocketBase

There are two flavors of the backend:

1. Standard release downloaded from https://github.com/pocketbase/pocketbase/releases. It even allows [extending with JavaScript](https://pocketbase.io/docs/js-overview/). This one is a good start, but if you want full control see next.
2. Custom compiled (`go build`), possibly with my customizations and perhaps yours too.

`entrypoint.sh` defaults to option 2 if `go` compiler is found. If not, then is just downloads
`pocketbase` (option 1). Also, you can control it by looking at the `image` and `command` settings
in `docker-compose.yml` and `docker-compose.override.yml`.

# Setup

## Architecture

> **Note:** For optimal setup, ensure you are using Linux (bare-metal, VM, WSL) or Docker. For other operating systems, you may run into issues, or need additional configuration.
> A docker-compose setup is included with the project, which can be used on any OS.

## Run migrations

Before you can run the actual backend, you must run the migrations using `./pocketbase migrate up` in the current directory. It will create appropriate schema tables/collections.

## Run the backend

You can run the PocketBase backend direct with `./pocketbase serve` or using `npm run backend` in the `sk` directory. Note that `npm run backend` it is included by default, but if you want the backend to also serve the frontend assets, then you must add the `--publicDir ../frontend/build` option. (Read more about this in [sk/package.json](../sk/package.json).)

## Docker

A highly recommended option is to run it inside a Docker container. A `Dockerfile` is included that builds a production Docker image. Also, a `docker-compose.yml` along with an _override_ file example are included, which should be used during development.

# Schema (Collections)

With the 0.9 version of PocketBase, JavaScript auto-migrations as implemented. The JS files in `pb_migrations` can create/drop/modify collections and data. These are executed automatically by PocketBase on startup.

Not only that, they are also generated automatically whenever you change the schema! So go ahead and make changes to the schema and watch new JS files generated in the `pb_migrations` folder. Just remember to commit them to version control.

## Generated Types

The file `generated-types.ts` contains TypeScript definitions of `Record` types mirroring the fields in your database collections. But it needs to be regenerated every time you modify the schema. This can be done by simply running the `typegen` script in the frontend's `package.json`. So remember to do that.
