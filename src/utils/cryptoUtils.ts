import * as nacl from 'tweetnacl';
import { PublicKey } from '@solana/web3.js';

export function generateNonce(): string {
  return nacl.randomBytes(16).reduce((p, i) => p + i.toString(16).padStart(2, '0'), '');
}

export async function verifySignature(publicKeyString: string, signatureString: string, message: string): Promise<boolean> {
  try {
    const publicKey = new PublicKey(publicKeyString);
    const signature = Buffer.from(signatureString, 'base64');
    const messageBytes = new TextEncoder().encode(message);

    return nacl.sign.detached.verify(messageBytes, signature, publicKey.toBytes());
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

