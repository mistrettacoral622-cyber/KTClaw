import { z } from 'zod';
import { BaseChannelConfigSchema } from '../types';

export const FeishuChannelConfigSchema = BaseChannelConfigSchema.extend({
  appId: z.string().trim().min(1, 'appId is required'),
  appSecret: z.string().trim().min(1, 'appSecret is required'),
  sendMarkdownAsCard: z.boolean().optional().default(false),
  textChunkLimit: z.number().int().positive().optional().default(4000),
  connectionMode: z.enum(['websocket', 'webhook']).optional().default('websocket'),
  dedupTtlMs: z.number().int().positive().optional().default(60_000),
});

export type FeishuChannelConfig = z.infer<typeof FeishuChannelConfigSchema>;
