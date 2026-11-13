import type { ApprovalRule, Developer } from '../types/index.js';

export const selectCodeOwnerReviewer = ({ rules, users, activeUsers, authorNick, leadNick, reviewer }: { rules: ApprovalRule[]; users: Developer[]; activeUsers: Developer[]; authorNick: string; leadNick: string; reviewer: Developer }) => {
  const codeOwnerRule = rules.find((rule) => rule.rule_type === 'code_owner');

  if (!Array.isArray(codeOwnerRule?.eligible_approvers)) {
    return { reviewer, unavailable: false };
  }

  const knownOwners = codeOwnerRule.eligible_approvers.filter((owner) =>
    users.some((user) => user.gitlabName === owner.username),
  );

  if (knownOwners.length === 0) {
    return { reviewer, unavailable: false };
  }

  const availableOwners = knownOwners.filter((owner) =>
    activeUsers.some((user) => user.gitlabName === owner.username && user.messengerNick !== authorNick),
  );

  if (availableOwners.length === 0) {
    return { reviewer, unavailable: true };
  }

  if (availableOwners.some((owner) => owner.username === leadNick || owner.username === reviewer.gitlabName)) {
    return { reviewer, unavailable: false };
  }

  const owner = availableOwners[Math.floor(Math.random() * availableOwners.length)];
  const selectedUser = activeUsers.find((user) => user.gitlabName === owner.username);

  return { reviewer: { ...selectedUser, id: owner.id }, unavailable: false };
};
