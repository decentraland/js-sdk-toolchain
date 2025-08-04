import { describe, it, expect, vi } from 'vitest';
import { ChainId } from '@dcl/schemas';
import { getAvailableCatalystServer } from './utils';

vi.mock('dcl-catalyst-client/dist/contracts-snapshots', () => ({
  getCatalystServersFromCache: vi.fn((network: string) => {
    switch (network) {
      case 'sepolia':
        return [
          { address: 'https://peer.decentraland.zone' },
          { address: 'https://peer-ec2.decentraland.zone' },
        ];
      default:
        return [
          { address: 'https://peer.decentraland.org' },
          { address: 'https://peer-ec2.decentraland.org' },
        ];
    }
  }),
}));

describe('getAvailableCatalystServer', () => {
  it('should return a server for sepolia network', () => {
    const triedServers = new Set<string>();
    const result = getAvailableCatalystServer(triedServers, ChainId.ETHEREUM_SEPOLIA);

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should return a server for mainnet network', () => {
    const triedServers = new Set<string>();
    const result = getAvailableCatalystServer(triedServers, ChainId.ETHEREUM_MAINNET);

    expect(result).toBeDefined();
    expect(typeof result).toBe('string');
  });

  it('should exclude tried servers from the selection', () => {
    const triedServers = new Set<string>();
    const firstResult = getAvailableCatalystServer(triedServers, ChainId.ETHEREUM_SEPOLIA);
    triedServers.add(firstResult);
    const secondResult = getAvailableCatalystServer(triedServers, ChainId.ETHEREUM_SEPOLIA);
    triedServers.add(secondResult);

    expect(triedServers).toContain(firstResult);
    expect(triedServers).toContain(secondResult);
  });

  describe('when no servers in cache', () => {
    it('should throw error', () => {
      const triedServers = new Set<string>([
        'https://peer.decentraland.zone',
        'https://peer-ec2.decentraland.zone',
      ]);

      expect(() => getAvailableCatalystServer(triedServers, ChainId.ETHEREUM_SEPOLIA)).toThrow(
        'No available catalyst servers to try',
      );
    });
  });
});
