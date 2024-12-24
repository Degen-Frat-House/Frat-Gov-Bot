import { Scenes } from 'telegraf';
import { getUserByTelegramId, createProposal } from '../database';
import { getToken2022Balance } from '../utils/solanaUtils';
import { CustomContext, CreateProposalWizardState } from '../types';

export const createProposalScene = new Scenes.WizardScene<CustomContext>(
  'createProposal',
  async (ctx) => {
    const userId = ctx.from?.id.toString();
    if (!userId) {
      await ctx.reply('Unable to identify user.');
      return ctx.scene.leave();
    }

    const user = await getUserByTelegramId(userId);
    if (!user || !user.walletAddress) {
      await ctx.reply('You need to link your wallet first. Use /linkwallet to do so.');
      return ctx.scene.leave();
    }

    const balance = await getToken2022Balance(user.walletAddress);
    if (balance === 0) {
      await ctx.reply('You need to hold governance tokens to create a proposal.');
      return ctx.scene.leave();
    }

    ctx.scene.session.createProposalState = {};
    await ctx.reply('Please enter the proposal title:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('Please enter a valid title.');
      return;
    }

    const state = ctx.scene.session.createProposalState as CreateProposalWizardState;
    state.proposalTitle = ctx.message.text;
    await ctx.reply('Please enter the proposal description:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('Please enter a valid description.');
      return;
    }

    const state = ctx.scene.session.createProposalState as CreateProposalWizardState;
    state.proposalDescription = ctx.message.text;
    await ctx.reply('Please enter the voting period in hours:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('Please enter a valid number of hours.');
      return;
    }

    const votingPeriod = parseInt(ctx.message.text);
    if (isNaN(votingPeriod) || votingPeriod <= 0) {
      await ctx.reply('Invalid voting period. Please enter a positive number of hours.');
      return;
    }

    const userId = ctx.from?.id.toString();
    if (!userId) {
      await ctx.reply('Unable to identify user.');
      return ctx.scene.leave();
    }

    const state = ctx.scene.session.createProposalState as CreateProposalWizardState;

    try {
      const proposal = await createProposal({
        title: state.proposalTitle!,
        description: state.proposalDescription!,
        creatorId: userId,
        votingPeriod,
        createdAt: new Date(),
        status: 'active'
      });

      await ctx.reply(`Proposal created successfully! Proposal ID: ${proposal.id}`);
      // Notify the group about the new proposal
      await ctx.telegram.sendMessage(process.env.TELEGRAM_GROUP_ID!, 
        `New proposal created!\n\nTitle: ${proposal.title}\n\nUse /vote ${proposal.id} to cast your vote.`);
    } catch (error) {
      console.error('Error creating proposal:', error);
      await ctx.reply('Failed to create proposal. Please try again.');
    }

    return ctx.scene.leave();
  }
);

