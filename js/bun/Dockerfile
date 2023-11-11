FROM oven/bun:alpine AS build

WORKDIR /app

COPY . .

RUN bun build index.ts --target bun --outdir ./out

FROM oven/bun:alpine

WORKDIR /app

COPY --from=build /app/out .

CMD ["bun", "run", "index.js"]