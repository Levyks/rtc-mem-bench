import { program } from "commander";
import { z } from "zod";

program
  .requiredOption("-s, --server-image <server-image>", "Server image")
  .requiredOption(
    "--url <url>",
    "Url to the server, use {server} as a placeholder for the server ip/hostnames"
  )
  .option(
    "-c, --clients-per-room <clients-per-room>",
    "Number of clients per room",
    "8"
  )
  .option(
    "-t, --transport <transport-type>",
    "Transport to use for the benchmark",
    "ws"
  )
  .option("--total-clients <total-clients>", "Total number of clients", "64000")
  .option("-l, --loop-delay <delay>", "Delay between loops in ms", "1000")
  .option("--server-delay <delay>", "Delay after starting the server", "1000")
  .option("-n, --network <network>", "Docker network", "rtc-mem-bench")
  .option(
    "-m, --memory <memory>",
    "Memory limit for server container in bytes",
    (536_870_912).toString()
  );

program.parse();

export const options = z
  .object({
    serverImage: z.string(),
    url: z.string(),
    clientsPerRoom: z.coerce.number(),
    transport: z.string(),
    loopDelay: z.coerce.number(),
    totalClients: z.coerce.number(),
    serverDelay: z.coerce.number(),
    network: z.string(),
    memory: z.coerce.number(),
  })
  .parse(program.opts());
