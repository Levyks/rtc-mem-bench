FROM rust:1.73-alpine AS builder

RUN apk add --no-cache musl-dev

WORKDIR /usr/src/app

COPY . .

RUN cargo build --release

FROM alpine:latest AS runtime

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/target/release/ .