import { z } from 'zod';

const logSchema = z.object({
  title: z.string().optional(),
  totalVolumes: z.number().nullable().optional(),
  ranges: z.array(z.array(z.number()).length(2)).optional().default([])
});

export const createSeriesSchema = z.object({
  title: z.string().min(1, "กรุณากรอกชื่อเรื่อง"),
  author: z.string().min(1, "กรุณากรอกชื่อผู้แต่ง"),
  publisher: z.string().min(1, "กรุณากรอกชื่อสำนักพิมพ์"),
  type: z.enum(['manga', 'novel', 'light_novel']).default('manga'),
  publishYear: z.number().nullable().optional(),
  endYear: z.number().nullable().optional(),
  status: z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']).default('ongoing'),
  isCollecting: z.boolean().default(true),
  rating: z.number().min(0).max(5).default(0),
  imageUrl: z.string().url().or(z.literal('')).optional().default(''),
  notes: z.string().optional().default(''),
  readingLogs: z.array(logSchema).optional().default([]),
  collectionLogs: z.array(logSchema).optional().default([])
});

export const updateSeriesSchema = createSeriesSchema.partial().extend({
  // Ensure title/author/publisher can't be set to empty strings if provided
  title: z.string().min(1).optional(),
  author: z.string().min(1).optional(),
  publisher: z.string().min(1).optional()
});
