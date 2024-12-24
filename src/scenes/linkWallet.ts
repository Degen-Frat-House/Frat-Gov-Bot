import { Scenes } from 'telegraf';
import { CustomContext } from '../types';
import { linkWalletToUser, getUserByTelegramId } from '../database';
import { getToken2022Balance } from '../utils/solanaUtils';

export const linkWalletScene = new Scenes.WizardScene<CustomContext>(
  'linkWallet',
  async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (!userId) {
      await ctx.reply('Unable to identify user.');
      return ctx.scene.leave();
    }

    const user = await getUserByTelegramId(userId);
    if (user && user.walletAddress) {
      await ctx.reply('You already have a wallet linked. Use /unlinkwallet to unlink it first.');
      return ctx.scene.leave();
    }

    const webAppUrl = `${process.env.BOT_DOMAIN}/wallet-link-app`;
    await ctx.reply('Click the button below to link your Solana wallet:', {
      reply_markup: {
        inline_keyboard: [[{ text: 'Link Wallet', web_app: { url: webAppUrl } }]]
      }
    });

    return ctx.wizard.next();
  },
  async (ctx) => {
    if (ctx.message && 'web_app_data' in ctx.message) {
      const data = JSON.parse(ctx.message.web_app_data.data);
      const publicKey = data.publicKey;

      if (!publicKey) {
        await ctx.reply('Error: No wallet address received. Please try again.');
        return;
      }

      const userId = ctx.from?.id.toString();
      if (!userId) {
        await ctx.reply('Unable to identify user.');
        return ctx.scene.leave();
      }

      await linkWalletToUser(userId, publicKey);
      const balance = await getToken2022Balance(publicKey);

      await ctx.reply(`Wallet ${publicKey} successfully linked to your account.
Your current token balance is: ${balance}`);

      return ctx.scene.leave();
    } else {
      await ctx.reply('Please use the "Link Wallet" button to connect your wallet.');
    }
  }
);

export async function handleWalletLink(userId: string, walletAddress: string) {
  await linkWalletToUser(userId, walletAddress);
  const balance = await getToken2022Balance(walletAddress);
  return `Wallet ${walletAddress} successfully linked to your account.\nYour current token balance is: ${balance}`;
}

