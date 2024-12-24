import { Scenes } from 'telegraf';
import { getUserByTelegramId, getProposal, recordVote } from '../database';
import { getToken2022Balance } from '../utils/solanaUtils';
import { CustomContext, VoteWizardState } from '../types';

export const voteScene = new Scenes.WizardScene<CustomContext>(
  'vote',
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

    const balance = await getToken2022Balance(user.walletAddress!);
    if (balance === 0) {
      await ctx.reply('You need to hold governance tokens to vote.');
      return ctx.scene.leave();
    }

    ctx.scene.session.voteState = {};
    await ctx.reply('Please enter the proposal ID you want to vote on:');
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('Please enter a valid proposal ID.');
      return;
    }

    const proposalId = ctx.message.text;
    const proposal = await getProposal(proposalId);
    if (!proposal) {
      await ctx.reply('Invalid proposal ID.');
      return ctx.scene.leave();
    }

    if (proposal.status !== 'active') {
      await ctx.reply('This proposal is not active.');
      return ctx.scene.leave();
    }

    const state = ctx.scene.session.voteState as VoteWizardState;
    state.proposalId = proposalId;
    await ctx.reply(`Proposal: ${proposal.title}\n\nPlease vote by replying with either 'yes' or 'no'.`);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.message || !('text' in ctx.message)) {
      await ctx.reply('Please vote "yes" or "no".');
      return;
    }

    const voteChoice = ctx.message.text.toLowerCase();
    if (voteChoice !== 'yes' && voteChoice !== 'no') {
      await ctx.reply('Invalid vote. Please vote "yes" or "no".');
      return;
    }

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

    const state = ctx.scene.session.voteState as VoteWizardState;

    try {
      await recordVote({
        proposalId: state.proposalId!,
        userId,
        vote: voteChoice === 'yes',
        weight: balance
      });

      await ctx.reply('Your vote has been recorded successfully.');
    } catch (error) {
      console.error('Error recording vote:', error);
      await ctx.reply('Failed to record your vote. Please try again.');
    }

    return ctx.scene.leave();
  }
);

