import { CustomContext } from '../types';

export async function vote(ctx: CustomContext) {
  await ctx.scene.enter('vote');
}

