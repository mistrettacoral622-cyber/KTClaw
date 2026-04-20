import { z } from 'zod';
import { BaseChannelConfigSchema } from '../types';

export const WeChatChannelConfigSchema = BaseChannelConfigSchema.extend({
  channelType: z.literal('wechat').optional().default('wechat'),
  textChunkLimit: z.number().int().positive().optional().default(4000),
  qrPollMs: z.number().int().positive().optional().default(2_000),
  qrTtlMs: z.number().int().positive().optional().default(300_000),
});

export type WeChatChannelConfig = z.infer<typeof WeChatChannelConfigSchema>;
