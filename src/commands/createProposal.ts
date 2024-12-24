import { CustomContext } from '../types';

export async function createProposal(ctx: CustomContext) {
  await ctx.scene.enter('createProposal');
}

