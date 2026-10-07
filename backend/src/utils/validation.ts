import { z } from 'zod';

// The UI walks every volume of every range and total, so one absurd number (a pasted ISBN, a typo) would freeze or
// crash it on every load. Keep in step with MAX_VOLUME in frontend/src/utils/constants.ts.
const volume = z.number().int().nonnegative().max(9999);

export const logSchema = z.object({
  id: z.string().optional(), // lets a save keep the identity of a log the series already owns
  title: z.string().trim().optional(),
  totalVolumes: volume.nullable().optional(),
  format: z.string().trim().max(32).optional(), // collection logs only; reading logs ignore it
  language: z.enum(['th', 'jp', 'en', 'other']).optional(), // collection logs only
  isPartial: z.boolean().optional(), // collection logs only: selective keep, never counted as missing
  ranges: z.array(z.array(volume).length(2)).optional().default([])
});

const baseSeriesSchema = z.object({
  title: z.string().trim().min(1, "กรุณากรอกชื่อเรื่อง"),
  author: z.string().trim().min(1, "กรุณากรอกชื่อผู้แต่ง"),
  publisher: z.string().trim().min(1, "กรุณากรอกชื่อสำนักพิมพ์"),
  type: z.enum(['manga', 'novel', 'light_novel']).default('manga'),
  publishYear: z.number().int().nonnegative().nullable().optional(),
  endYear: z.number().int().nonnegative().nullable().optional(),
  status: z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']).default('ongoing'),
  isCollecting: z.boolean().default(true),
  isCollectingStopped: z.boolean().default(false),
  rating: z.number().min(0).max(5).default(0),
  imageUrl: z.string().url().or(z.literal('')).optional().default(''),
  notes: z.string().optional().default(''),
  readingLogs: z.array(logSchema).optional().default([]),
  collectionLogs: z.array(logSchema).optional().default([])
});

// ponytail: only checks when both years are in the payload; a PATCH with just one is not compared with the stored
// other one (the UI always sends both). Load the row in updateSeries if a client ever sends them separately.
const endNotBeforeStart = (b: { publishYear?: number | null; endYear?: number | null }) =>
  !b.publishYear || !b.endYear || b.endYear >= b.publishYear;
const endYearOrder = { message: 'ปีที่จบต้องไม่ก่อนปีที่พิมพ์', path: ['endYear'] };

export const createSeriesSchema = baseSeriesSchema.refine(endNotBeforeStart, endYearOrder);

export const updateSeriesSchema = baseSeriesSchema.partial().extend({
  // Ensure title/author/publisher can't be set to empty strings if provided
  title: z.string().trim().min(1).optional(),
  author: z.string().trim().min(1).optional(),
  publisher: z.string().trim().min(1).optional()
}).refine(endNotBeforeStart, endYearOrder);

export type CreateSeriesInput = z.infer<typeof createSeriesSchema>;
export type UpdateSeriesInput = z.infer<typeof updateSeriesSchema>;
export type BookLogInput = z.infer<typeof logSchema>;
