import { z } from 'zod';

const id = z.string().min(1).max(120).regex(/^[A-Za-z0-9:_-]+$/);
const text = max => z.string().trim().min(1).max(max);
export const placeSchema = z.object({
  id, name: text(200), kind: z.enum(['country', 'city', 'poi']),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  country: text(100).optional(), city: text(100).optional(),
  sourceUrl: z.url().max(2000).refine(value => ['https:', 'http:'].includes(new URL(value).protocol)).optional(),
}).strict();
const catalogSchema = z.array(placeSchema).max(200)
  .refine(places => new Set(places.map(place => place.id)).size === places.length, 'Place IDs must be unique.');
export const createRoomSchema = z.object({
  title: text(120), displayName: text(60), catalog: catalogSchema.default([]),
}).strict();
export const planSchema = z.object({
  title: text(160), summary: z.string().trim().max(2000),
  stopIds: z.array(id).min(1).max(30)
    .refine(ids => new Set(ids).size === ids.length, 'Each stop may appear once.'),
}).strict();
export const actionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('participant.join'), displayName: text(60) }).strict(),
  z.object({ type: z.literal('catalog.add'), place: placeSchema }).strict(),
  z.object({ type: z.literal('presence.focus'), destinationId: id.nullable() }).strict(),
  z.object({ type: z.literal('dream.add'), destinationId: id, note: z.string().trim().max(500).default('') }).strict(),
  z.object({ type: z.literal('dream.remove'), dreamId: id }).strict(),
  planSchema.extend({ type: z.literal('plan.propose') }).strict(),
  z.object({ type: z.literal('plan.accept') }).strict(),
  z.object({ type: z.literal('plan.reorder'), stopIds: z.array(id).min(1).max(30) }).strict(),
]);
export const actionEnvelopeSchema = z.object({
  expectedRevision: z.number().int().nonnegative(), participantId: id.optional(), action: actionSchema,
}).strict();
export const planningRequestSchema = z.object({
  roomId: id, participantId: id,
  preferences: z.string().trim().max(2000).default(''),
  locale: z.enum(['en', 'zh']).default('en'),
}).strict();
