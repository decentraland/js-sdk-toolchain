import type { ethers } from 'ethers';
import type { Socket } from 'socket.io-client';

export type AuthSignInProps = {
  socket: Socket;
  ephemeralAccount: ethers.HDNodeWallet;
  expiration: Date;
  ephemeralMessage: string;
  requestResponse: any;
};
