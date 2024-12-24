import { Scenes, Context } from 'telegraf';

export interface CreateProposalWizardState {
  proposalTitle?: string;
  proposalDescription?: string;
}

export interface VoteWizardState {
  proposalId?: string;
}

export interface LinkWalletState {
  nonce: string;
  message: string;
}

export interface CustomSessionData extends Scenes.WizardSessionData {
  createProposalState?: CreateProposalWizardState;
  voteState?: VoteWizardState;
  linkWalletState?: LinkWalletState;
}

export interface CustomWizardSession extends Scenes.WizardSession<CustomSessionData> {}

export interface CustomSceneSession extends Scenes.SceneSession<CustomSessionData> {}

export interface CustomContext extends Context {
  scene: Scenes.SceneContextScene<CustomContext, CustomSessionData>;
  wizard: Scenes.WizardContextWizard<CustomContext>;
  session: CustomSceneSession;
}

