import net, { type AddressInfo } from 'net';
import { future } from 'fp-future';

export async function getAvailablePort() {
  const promise = future<number>();
  const server = net.createServer();
  server.unref();
  server.on('error', promise.reject);
  server.listen(() => {
    const { port } = server.address() as AddressInfo;
    server.close(() => {
      promise.resolve(port);
    });
  });
  return promise;
}
