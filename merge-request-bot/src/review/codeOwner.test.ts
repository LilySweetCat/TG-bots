import test from 'node:test';
import assert from 'node:assert/strict';
import { selectCodeOwnerReviewer } from './codeOwner.js';

const reviewer = { gitlabName: 'reviewer', messengerNick: '@reviewer' };
const owner = { gitlabName: 'owner', messengerNick: '@owner' };
const rules = [{ rule_type: 'code_owner', eligible_approvers: [{ username: 'owner', id: 42 }] }];

test('replaces the reviewer with an available code owner and their GitLab id', () => {
  const selection = selectCodeOwnerReviewer({
    rules,
    users: [reviewer, owner],
    activeUsers: [reviewer, owner],
    authorNick: '@author',
    leadNick: 'lead',
    reviewer,
  });

  assert.deepEqual(selection, { reviewer: { ...owner, id: 42 }, unavailable: false });
});

test('keeps the reviewer if the lead is already a code owner', () => {
  const selection = selectCodeOwnerReviewer({
    rules,
    users: [reviewer, owner],
    activeUsers: [reviewer, owner],
    authorNick: '@author',
    leadNick: 'owner',
    reviewer,
  });

  assert.deepEqual(selection, { reviewer, unavailable: false });
});

test('reports when known code owners are unavailable', () => {
  const selection = selectCodeOwnerReviewer({
    rules,
    users: [reviewer, owner],
    activeUsers: [reviewer],
    authorNick: '@author',
    leadNick: 'lead',
    reviewer,
  });

  assert.deepEqual(selection, { reviewer, unavailable: true });
});
