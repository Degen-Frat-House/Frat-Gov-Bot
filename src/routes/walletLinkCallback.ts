import { Request, Response } from 'express';
import { handleWalletLink } from '../scenes/linkWallet';
import { bot } from '../index'; // Make sure to export the bot instance from index.ts

export async function walletLinkCallback(req: Request, res: Response) {
  const { userId, walletAddress } = req.body;

  if (!userId || !walletAddress) {
    return res.status(400).json({ error: 'Missing userId or walletAddress' });
  }

  try {
    const message = await handleWalletLink(userId, walletAddress);
    await bot.telegram.sendMessage(userId, message);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in wallet link callback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

