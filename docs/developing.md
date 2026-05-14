TODO: More custom documentation here 

# Frontend with SvelteKit

## Developing

Once you've created a project and installed dependencies with `pnpm install`, start a development server:
```bash
pnpm run dev
```

## Building
To create a production version of the app:
```bash
pnpm run build
```

You can preview the production build with `pnpm run preview`.

# Backend with PocketBase
We use the "release" flavor of pocketbase - the standard release downloaded from https://github.com/pocketbase/pocketbase/releases, which allows [extending with JavaScript](https://pocketbase.io/docs/js-overview/).

## Architecture
> **Note:** For optimal setup, ensure you are using Linux (bare-metal, VM, WSL) or Docker. For other operating systems, you may run into issues, or need additional configuration.
> A docker-compose setup is included with the project, which can be used on any OS.

## Run migrations

Before you can run the actual backend, you must run the migrations using `./pocketbase migrate up` in the current directory. It will create appropriate schema tables/collections.

## Run the backend

You can run the PocketBase backend direct with `pnpm run backend` in the `sk` directory. Note that `pnpm run backend` it is included by default, but if you want the backend to also serve the frontend assets, then you must add the `--publicDir ../frontend/build` option.

## Docker

A highly recommended option is to run it inside a Docker container. A `Dockerfile` is included that builds a production Docker image. Also, a `docker-compose.yml` along with an _override_ file example are included, which should be used during development.

# Schema (Collections)

With the 0.9 version of PocketBase, JavaScript auto-migrations as implemented. The JS files in `pb_migrations` can create/drop/modify collections and data. These are executed automatically by PocketBase on startup.

Not only that, they are also generated automatically whenever you change the schema! So go ahead and make changes to the schema and watch new JS files generated in the `pb_migrations` folder. Just remember to commit them to version control.

## Generated Types

The file `generated-types.ts` contains TypeScript definitions of `Record` types mirroring the fields in your database collections. But it needs to be regenerated every time you modify the schema. This can be done by simply running the `typegen` script in the frontend's `package.json`. So remember to do that.
