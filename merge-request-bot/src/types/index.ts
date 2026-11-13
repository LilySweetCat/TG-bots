/** Stored application data and the GitLab contracts used for reviewer selection. */
export interface Developer {
  messengerNick: string;
  gitlabName: string;
  id?: number;
}

export interface GitLabUser { username: string; id: number }
export interface ApprovalRule {
  rule_type?: string;
  eligible_approvers?: GitLabUser[];
  name?: string;
  approvals_required?: number;
}
export interface StoredMergeRequest {
  url: string;
  approvalsLeft: number;
  author: string;
  projectId: number;
  mrId: string;
  createdAt: string;
  approvers: string[];
  pipelineId?: number;
  state?: string;
  testStatus?: string;
  approved?: string;
  remove?: boolean;
}
export interface ChatSession {
  awaitingUserInput?: boolean;
  awaitingSuggestionsInput?: boolean;
}
export interface AiConfig {
  url: string;
  token: string;
  model: string;
  timeout: number;
  maxDiffChars: number;
}
export interface MessageOptions {
  incomingMessage?: string;
  counter?: boolean;
  html?: boolean;
}
