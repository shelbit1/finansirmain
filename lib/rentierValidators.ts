import { z } from "zod";

export const propertyTypeSchema = z.enum([
  "FREE_PURPOSE",
  "STREET_RETAIL",
  "SHOPPING_CENTER",
  "LAND",
  "PARKING",
  "WAREHOUSE",
  "STORAGE",
]);

export const propertyStatusSchema = z.enum([
  "WATCHING",
  "NEGOTIATING",
  "OWNED",
  "REJECTED",
]);

export const entranceSchema = z.enum(["STREET", "YARD", "SHARED"]);
export const conditionSchema = z.enum([
  "SHELL",
  "COSMETIC",
  "GOOD",
  "EXCELLENT",
]);

const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null));

const optionalNumber = z
  .union([z.coerce.number(), z.literal("").transform(() => null), z.null()])
  .optional()
  .transform((v) => (typeof v === "number" && Number.isFinite(v) ? v : null));

const optionalPositiveInt = z
  .union([
    z.coerce.number().int().nonnegative(),
    z.literal("").transform(() => null),
    z.null(),
  ])
  .optional()
  .transform((v) => (typeof v === "number" ? Math.round(v) : null));

const optionalDate = z
  .union([z.coerce.date(), z.literal("").transform(() => null), z.null()])
  .optional()
  .transform((v) => (v instanceof Date && !Number.isNaN(v.getTime()) ? v : null));

export const tenantSchema = z.object({
  name: z.string().trim().min(1, "Введите название арендатора").max(120),
  category: optionalText(80),
  area: optionalNumber,
  rentMonth: optionalNumber,
  leaseStart: optionalDate,
  leaseEnd: optionalDate,
  deposit: optionalNumber,
  notes: optionalText(500),
});

export const propertySchema = z.object({
  type: propertyTypeSchema,
  status: propertyStatusSchema.default("WATCHING"),
  title: z.string().trim().min(1, "Введите название объекта").max(200),
  notes: optionalText(2000),

  address: optionalText(300),
  city: optionalText(120),
  district: optionalText(120),
  metro: optionalText(120),
  metroWalk: optionalPositiveInt,
  floor: z
    .union([z.coerce.number().int(), z.literal("").transform(() => null), z.null()])
    .optional()
    .transform((v) => (typeof v === "number" ? Math.round(v) : null)),
  totalFloors: optionalPositiveInt,
  yearBuilt: optionalPositiveInt,

  area: optionalNumber,
  ceilingH: optionalNumber,
  entrance: entranceSchema.nullable().optional(),
  condition: conditionSchema.nullable().optional(),

  askPrice: optionalNumber,
  ownPrice: optionalNumber,
  pricePerSqm: optionalNumber,
  rentMonth: optionalNumber,
  rentPerSqm: optionalNumber,
  rentIndexPct: optionalNumber,
  communal: optionalNumber,
  tax: optionalNumber,
  management: optionalNumber,
  otherCosts: optionalNumber,

  hasTenants: z
    .union([z.boolean(), z.literal("on").transform(() => true), z.literal("true").transform(() => true)])
    .optional()
    .transform((v) => Boolean(v)),
  tenantPlan: optionalText(500),
  vacancyMonths: optionalPositiveInt,

  sourceUrl: z
    .string()
    .trim()
    .url("Введите корректную ссылку")
    .max(500)
    .optional()
    .nullable()
    .or(z.literal("").transform(() => null)),

  tenants: z.array(tenantSchema).optional().default([]),
});

export type PropertyInput = z.infer<typeof propertySchema>;
export type TenantInput = z.infer<typeof tenantSchema>;

export const aiAskSchema = z.object({
  propertyId: z.string().trim().min(1).optional().nullable(),
  prompt: z.string().trim().min(1, "Введите вопрос").max(2000),
});
