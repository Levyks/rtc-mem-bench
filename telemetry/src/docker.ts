import { Docker } from "node-docker-api";
import { Stream } from "stream";
import { Container } from "node-docker-api/lib/container";

export const docker = new Docker({
  socketPath: "/var/run/docker.sock",
});

const containersStarted: string[] = [];
let removeAllContainersPromise: Promise<void> | undefined;

export type ContainerResult = {
  id: string;
  ipAddress: string;
  memory: number;
};

export async function startContainer({
  image,
  network,
  cmd,
  memory,
  onStdout,
  exitProcessOnExit = true,
  trackStats = false,
}: {
  image: string;
  network: string;
  cmd?: string;
  memory?: number;
  onStdout?: (data: string) => void;
  exitProcessOnExit?: boolean;
  trackStats?: boolean;
}): Promise<ContainerResult> {
  const opts = {
    Image: image,
    Cmd: cmd?.split(" "),
    HostConfig: {
      Memory: memory,
      NetworkMode: network,
      Sysctls: {
        "net.ipv4.ip_local_port_range": "1024 65535",
      },
      AutoRemove: true,
    },
  };

  console.log(`Creating container with image ${image}`);
  const container = await docker.container.create(opts);
  console.log(`Created container ${container.id}, starting`);
  await container.start();
  console.log(`Started container ${container.id}`);
  containersStarted.push(container.id);

  const status = (await container.status()) as unknown as {
    data: {
      NetworkSettings: { Networks: { [key: string]: { IPAddress: string } } };
    };
  };

  const ipAddress = status.data.NetworkSettings.Networks[network].IPAddress;

  if (onStdout) {
    const stream = (await container.logs({
      follow: true,
      stdout: true,
      stderr: true,
    })) as Stream;
    stream.on("data", (data: Buffer) => {
      onStdout(data.subarray(8).toString());
    });
  }

  if (exitProcessOnExit) {
    waitAndExit(container);
  }

  const result = {
    id: container.id,
    ipAddress,
    memory: 0,
  };

  if (trackStats) {
    const statsStream = (await container.stats()) as Stream;
    statsStream.on("data", (data: Buffer) => {
      const stats = JSON.parse(data.toString());
      result.memory = stats.memory_stats.usage;
    });
  }

  return result;
}

async function waitAndExit(container: Container) {
  const result = (await container.wait()) as unknown as { StatusCode: number };
  console.error(
    `Container ${container.id} exited with code ${result.StatusCode}`
  );

  if (removeAllContainersPromise) return;

  await removeAllContainers();
  process.exit(result.StatusCode);
}

async function removeContainers(ids: string[]): Promise<void> {
  const promises = ids.map(async (id) => {
    console.log(`Removing container ${id}`);
    const container = docker.container.get(id);
    await container.delete({ force: true });
    console.log(`Removed container ${id}`);
  });

  await Promise.allSettled(promises);
}

export function removeAllContainers(): Promise<void> {
  if (!removeAllContainersPromise)
    removeAllContainersPromise = removeContainers(containersStarted);
  return removeAllContainersPromise;
}

async function networkExists(network: string): Promise<boolean> {
  const networks = await docker.network.list({
    filters: JSON.stringify({
      name: [network],
    }),
  });

  return networks.some(
    (n) => (n.data as Record<string, unknown>).Name === network
  );
}

async function createNetwork(network: string): Promise<void> {
  await docker.network.create({
    Name: network,
  });
}

export async function ensureNetworkExists(network: string): Promise<void> {
  const exists = await networkExists(network);
  console.log(`Does network ${network} exist? ${exists}`);
  if (!exists) await createNetwork(network);
}

process.on("SIGINT", async () => {
  if (!containersStarted.length) process.exit();
  await removeAllContainers();
  process.exit();
});
