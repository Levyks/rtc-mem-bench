import { options } from "./program";
import {
  ensureNetworkExists,
  startContainer,
  removeAllContainers,
  ContainerResult,
} from "./docker";
import { createExplodedPromise, delay } from "./misc";
import { createWriteStream } from "fs";
import { mkdir } from "fs/promises";
import { dirname } from "path";

type ClientDump = {
  roomsCreated: number;
  clientsConnected: number;
  loopAvgSum: number;
  loopAvgCount: number;
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

  console.log(`Waiting ${options.serverDelay}ms`);
  await delay(options.serverDelay);

  const dumps: ClientDump[] = [];

  startResultDumper(server, dumps);

  while (true) {
    await startClient(server.ipAddress, dumps);
  }
}

async function startClient(
  serverIp: string,
  dumps: ClientDump[]
): Promise<void> {
  const url = options.url.replace("{server}", serverIp);
  console.log("url", url, serverIp);
  const numberOfRooms = Math.floor(
    options.totalClients / options.clientsPerRoom
  );
  const cmd = `./rtc-mem-bench-client ${options.transport} ${url} ${numberOfRooms} ${options.clientsPerRoom} ${options.loopDelay}`;

  console.log(`Starting client container with cmd "${cmd}"`);

  const { promise, resolve } = createExplodedPromise<void>();

  const container = await startContainer({
    image: "rtc-mem-bench-client",
    network: options.network,
    cmd,
    onStdout: (data) => {
      const newDump = JSON.parse(data.trim()) as ClientDump;

      dump.roomsCreated = newDump.roomsCreated;
      dump.clientsConnected = newDump.clientsConnected;
      dump.loopAvgSum += newDump.loopAvgSum;
      dump.loopAvgCount += newDump.loopAvgCount;

      if (newDump.roomsCreated >= numberOfRooms) {
        resolve();
      }
    },
  });

  const dump: ClientDump = {
    roomsCreated: 0,
    clientsConnected: 0,
    loopAvgSum: 0,
    loopAvgCount: 0,
  };
  dumps.push(dump);

  return promise;
}

async function startResultDumper(
  server: ContainerResult,
  dumps: ClientDump[],
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

    for (const dump of dumps) {
      roomsCreated += dump.roomsCreated;
      clientsConnected += dump.clientsConnected;
      loopAvgSum += dump.loopAvgSum;
      loopAvgCount += dump.loopAvgCount;

      dump.loopAvgSum = 0;
      dump.loopAvgCount = 0;
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
