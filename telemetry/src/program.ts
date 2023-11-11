import { program, Option } from "commander";
import { z } from "zod";

program
  .requiredOption("-s, --server-image <server-image>", "Server image")
  .requiredOption(
    "-c, --client-args <client-args>",
    "Client args, use {server} as a placeholder for the server ip/hostnames"
  )
  .option("-q, --client-quanity <client-quanity>", "Client quanity", "1")
  .option("-n, --network <network>", "Docker network", "rtc-mem-bench")
  .option("-d, --delay <delay>", "Delay after server starts (ms)", "1000")
  .option(
    "-m, --memory <memory>",
    "Memory limit for server container in bytes",
    (536_870_912).toString()
  );

program.parse();

export const options = z
  .object({
    serverImage: z.string(),
    serverContainerName: z.string().optional(),
    clientArgs: z.string(),
    clientQuanity: z.coerce.number(),
    network: z.string(),
    delay: z.coerce.number(),
    memory: z.coerce.number(),
  })
  .transform((obj) => ({
    ...obj,
    serverContainerName: obj.serverContainerName ?? obj.serverImage,
  }))
  .parse(program.opts());
