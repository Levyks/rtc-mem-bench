import { options } from "./program";
import {
  ensureNetworkExists,
  startContainer,
  removeAllContainers,
} from "./docker";
import { delay } from "./misc";
import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { dirname } from "path";

type ClientDump = {
  roomsCreated: number;
  clientsConnected: number;
  loopAvgSum: number;
  loopAvgCount: number;
  timestamp: string;
};

async function main() {
  ensureNetworkExists(options.network);

  console.log(`Starting server container with image ${options.serverImage}`);
  const server = await startContainer({
    image: options.serverImage,
    network: options.network,
    memory: options.memory,
    trackStats: true,
  });

  console.log(`Waiting ${options.delay}ms`);
  await delay(options.delay);

  const args = options.clientArgs.replace("{server}", server.ipAddress);

  const clients: Awaited<ReturnType<typeof startClient>>[] = [];

  for (let i = 0; i < options.clientQuanity; i++) {
    clients.push(await startClient(args));
  }

  startResultDumper(server, clients);
}

async function startClient(args: string) {
  console.log(`Starting client container with args ${args}`);

  const container = await startContainer({
    image: "rtc-mem-bench-client",
    network: options.network,
    cmd: args,
    onStdout: (data) => {
      result.lastDump = JSON.parse(data.trim());
    },
  });

  const result = { id: container.id, lastDump: <ClientDump | null>null };

  return result;
}

async function startResultDumper(
  server: Awaited<ReturnType<typeof startContainer>>,
  clients: Awaited<ReturnType<typeof startClient>>[],
  interval = 5000
) {
  const now = new Date();
  const fileName = `./results/${options.serverImage}-${now
    .toISOString()
    .replace(/:/g, "_")}.csv`;
  const dir = dirname(fileName);
  await mkdir(dir, { recursive: true });
  const resultStream = createWriteStream(fileName);
  setInterval(() => {
    let roomsCreated = 0;
    let clientsConnected = 0;
    let loopAvgSum = 0;
    let loopAvgCount = 0;

    for (const client of clients) {
      const { lastDump } = client;
      if (!lastDump) continue;
      roomsCreated += lastDump.roomsCreated;
      clientsConnected += lastDump.clientsConnected;
      loopAvgSum += lastDump.loopAvgSum;
      loopAvgCount += lastDump.loopAvgCount;
    }

    const now = new Date();
    const avg = loopAvgSum / loopAvgCount;

    const line = `${now.toISOString()},${roomsCreated},${clientsConnected},${avg},${
      server.memory
    }\n`;

    resultStream.write(line);
  }, interval);
}

main().catch(async (err) => {
  await removeAllContainers();
  throw err;
});
