import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

const TOKEN_MINT_ADDRESS = process.env.TOKEN_MINT_ADDRESS;

if (!TOKEN_MINT_ADDRESS) {
  console.warn('Warning: TOKEN_MINT_ADDRESS is not set in the environment variables. Some functionality may be limited.');
}

export async function getToken2022Balance(walletAddress: string): Promise<number> {
  if (!TOKEN_MINT_ADDRESS) {
    console.error('Error: TOKEN_MINT_ADDRESS is not set. Unable to fetch token balance.');
    return 0;
  }

  const walletPublicKey = new PublicKey(walletAddress);
  const tokenMintPublicKey = new PublicKey(TOKEN_MINT_ADDRESS as string);

  const associatedTokenAddress = await getAssociatedTokenAddress(tokenMintPublicKey, walletPublicKey);

  try {
    const tokenAccount = await getAccount(connection, associatedTokenAddress);
    return Number(tokenAccount.amount);
  } catch (error) {
    console.error('Error fetching token balance:', error);
    return 0;
  }
}

export async function hasMinimumTokenBalance(walletAddress: string, minimumBalance: number): Promise<boolean> {
  const balance = await getToken2022Balance(walletAddress);
  return balance >= minimumBalance;
}

