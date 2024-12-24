import express, { Request, Response } from 'express'; // <-- import types here
import { Telegraf, Scenes, session } from 'telegraf';
import dotenv from 'dotenv';
import path from 'path';
import { linkWalletScene } from './scenes/linkWallet';
import { createProposalScene } from './scenes/createProposal';
import { voteScene } from './scenes/vote';
import { setupDatabase } from './database';
import { createProposal } from './commands/createProposal';
import { vote } from './commands/vote';
import { CustomContext } from './types';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the 'web' directory
app.use(express.static(path.join(__dirname, 'web')));

// Add explicit types for req/res
app.get('/wallet-link-app', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'web', 'wallet-link-app.html'));
});

console.log('Environment variables:');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? 'Set' : 'Not set');
console.log('SOLANA_RPC_URL:', process.env.SOLANA_RPC_URL);
console.log('TOKEN_MINT_ADDRESS:', process.env.TOKEN_MINT_ADDRESS);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'Set' : 'Not set');
console.log('TELEGRAM_GROUP_ID:', process.env.TELEGRAM_GROUP_ID);
console.log('HELIUS_RPC_URL:', process.env.HELIUS_RPC_URL);
console.log('BOT_DOMAIN:', "https://localhost:3000");

// Check if required environment variables are set
const requiredEnvVars = [
  'TELEGRAM_BOT_TOKEN',
  'SOLANA_RPC_URL',
  'TOKEN_MINT_ADDRESS',
  'MONGODB_URI',
  'TELEGRAM_GROUP_ID',
  'BOT_DOMAIN'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('Error: The following required environment variables are not set:');
  missingEnvVars.forEach(varName => console.error(`- ${varName}`));
  process.exit(1);
}

console.log('All required environment variables are set.');

export const bot = new Telegraf<CustomContext>(process.env.TELEGRAM_BOT_TOKEN!);

const stage = new Scenes.Stage<CustomContext>([
  linkWalletScene,
  createProposalScene,
  voteScene
]);

bot.use(session());
bot.use(stage.middleware());

bot.command('start', async (ctx) => {
  const welcomeMessage = `
Welcome to the Governance Bot! 🚀

This bot allows you to participate in on-chain governance for our project. Here are the main features:

🔗 Link your wallet
📝 Create proposals
🗳️ Vote on active proposals

To get started, use the /menu command to see available options.
  `;
  await ctx.reply(welcomeMessage);
});

bot.command('menu', async (ctx) => {
  await ctx.reply('What would you like to do?', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔗 Link Wallet', callback_data: 'link_wallet' }],
        [{ text: '📝 Create Proposal', callback_data: 'create_proposal' }],
        [{ text: '🗳️ Vote', callback_data: 'vote' }],
        [{ text: '📊 View Active Proposals', callback_data: 'view_proposals' }],
        [{ text: '❓ Help', callback_data: 'help' }]
      ]
    }
  });
});

bot.action('link_wallet', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.scene.enter('linkWallet');
});
bot.action('create_proposal', createProposal);
bot.action('vote', vote);
bot.action('view_proposals', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('Feature coming soon: View active proposals');
});
bot.action('help', async (ctx) => {
  await ctx.answerCbQuery();
  await ctx.reply('For assistance, please visit our support channel: [Support Channel Link]');
});

bot.command('help', (ctx) => {
  ctx.reply(
    'Available commands:\n/menu - Show main menu\n/linkwallet - Link your Solana wallet\n/createproposal - Create a new proposal\n/vote - Vote on an existing proposal'
  );
});

bot.command('linkwallet', (ctx) => ctx.scene.enter('linkWallet'));
bot.command('createproposal', createProposal);
bot.command('vote', vote);

async function startBot() {
  try {
    console.log('Setting up database...');
    await setupDatabase();
    console.log('Database setup complete.');

    console.log('Launching bot...');
    await bot.launch();
    console.log('Bot is running...');

    app.listen(port, () => {
      console.log(`Web app is running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start the bot:', error);
    process.exit(1);
  }
}

startBot();

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
