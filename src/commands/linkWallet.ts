import { Markup } from 'telegraf';
import { CustomContext } from '../types';

export async function linkWallet(ctx: CustomContext) {
  if (ctx.callbackQuery) {
    await ctx.answerCbQuery();
  }
  await displayLinkWalletButton(ctx);
}

export async function displayLinkWalletButton(ctx: CustomContext) {
  await ctx.reply('Ready to link your wallet? Click the button below to start the process:', 
    Markup.inlineKeyboard([
      Markup.button.callback('🔗 Link My Wallet', 'start_wallet_link')
    ])
  );
}

