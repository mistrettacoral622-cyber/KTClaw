export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string;
}

export function checkDmPolicy(params: {
  dmPolicy: 'open' | 'pairing' | 'allowlist';
  senderId: string;
  allowFrom?: string[];
}): PolicyCheckResult {
  const { dmPolicy, senderId, allowFrom } = params;

  if (dmPolicy === 'open') {
    return { allowed: true };
  }

  if (dmPolicy === 'pairing') {
    return { allowed: true, reason: 'new_pairing' };
  }

  // allowlist
  if (allowFrom && allowFrom.length > 0 && allowFrom.includes(senderId)) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'sender_not_in_allowlist' };
}

export function checkGroupPolicy(params: {
  groupPolicy: 'open' | 'allowlist' | 'disabled';
  conversationId: string;
  groupAllowFrom?: string[];
  requireMention: boolean;
  mentionedBot: boolean;
}): PolicyCheckResult {
  const { groupPolicy, conversationId, groupAllowFrom, requireMention, mentionedBot } = params;

  if (groupPolicy === 'disabled') {
    return { allowed: false, reason: 'group_messages_disabled' };
  }

  if (groupPolicy === 'allowlist') {
    if (!groupAllowFrom || groupAllowFrom.length === 0 || !groupAllowFrom.includes(conversationId)) {
      return { allowed: false, reason: 'group_not_in_allowlist' };
    }
    // fall through to mention check
  }

  // open or allowlist-passed
  if (requireMention && !mentionedBot) {
    return { allowed: false, reason: 'mention_required' };
  }

  return { allowed: true };
}
