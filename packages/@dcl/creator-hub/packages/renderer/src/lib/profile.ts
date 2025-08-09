import type { Avatar, Profile } from '@dcl/schemas';

const PEER_URL = 'https://peer.decentraland.org';

class Profiles {
  public async fetchProfile(address: string): Promise<Avatar | undefined> {
    try {
      const response = await fetch(`${PEER_URL}/lambdas/profiles/${address}`);
      const profile = (await response.json()) as Profile;
      return profile.avatars[0];
    } catch (error) {
      console.error(error);
      return undefined;
    }
  }
}

export default new Profiles();
