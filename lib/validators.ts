import { z } from "zod";

export const emailSchema = z.string().email("Введите корректный e-mail").toLowerCase().trim();

export const passwordSchema = z
  .string()
  .min(8, "Минимум 8 символов")
  .max(128, "Слишком длинный пароль");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Введите имя").max(80, "Слишком длинное имя"),
  email: emailSchema,
  password: passwordSchema,
  consent: z
    .string()
    .refine((v) => v === "on" || v === "true", {
      message: "Необходимо согласие на обработку персональных данных",
    }),
  marketingConsent: z
    .string()
    .optional()
    .transform((v) => v === "on" || v === "true"),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Введите пароль"),
});

const amount = z.coerce
  .number({ error: "Введите число" })
  .positive("Сумма должна быть больше нуля");

const optionalString = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(60),
  currency: z.string().trim().min(3).max(8).default("RUB"),
  balance: z.coerce.number().default(0),
  icon: optionalString,
  color: optionalString,
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(60),
  icon: optionalString,
  color: optionalString,
});

export const transactionTypeSchema = z.enum([
  "INCOME",
  "EXPENSE",
  "TRANSFER",
  "DEBT_TAKE",
  "DEBT_RETURN",
  "DEBT_GIVE",
  "DEBT_RECEIVE",
]);

export const transactionSchema = z
  .object({
    type: transactionTypeSchema,
    amount,
    date: z.coerce.date(),
    note: optionalString,
    incomeCategoryId: z.string().optional().nullable(),
    expenseCategoryId: z.string().optional().nullable(),
    fromAccountId: z.string().optional().nullable(),
    toAccountId: z.string().optional().nullable(),
    interestAmount: z.coerce.number().nonnegative("Сумма не может быть отрицательной").optional().nullable(),
    personName: z
      .string()
      .trim()
      .max(80, "Слишком длинное имя")
      .optional()
      .nullable()
      .transform((v) => (v && v.length > 0 ? v : null)),
    debtId: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "INCOME") {
      if (!data.toAccountId) {
        ctx.addIssue({ code: "custom", path: ["toAccountId"], message: "Выберите счёт зачисления" });
      }
      if (!data.incomeCategoryId) {
        ctx.addIssue({
          code: "custom",
          path: ["incomeCategoryId"],
          message: "Выберите статью дохода",
        });
      }
    }
    if (data.type === "EXPENSE") {
      if (!data.fromAccountId) {
        ctx.addIssue({
          code: "custom",
          path: ["fromAccountId"],
          message: "Выберите счёт списания",
        });
      }
      if (!data.expenseCategoryId) {
        ctx.addIssue({
          code: "custom",
          path: ["expenseCategoryId"],
          message: "Выберите статью расхода",
        });
      }
    }
    if (data.type === "TRANSFER") {
      if (!data.fromAccountId || !data.toAccountId) {
        ctx.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "Выберите оба счёта",
        });
      }
      if (data.fromAccountId && data.toAccountId && data.fromAccountId === data.toAccountId) {
        ctx.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "Счета должны различаться",
        });
      }
    }
    if (data.type === "DEBT_TAKE" || data.type === "DEBT_RECEIVE") {
      if (!data.toAccountId) {
        ctx.addIssue({
          code: "custom",
          path: ["toAccountId"],
          message: "Выберите счёт зачисления",
        });
      }
    }
    if (data.type === "DEBT_RETURN" || data.type === "DEBT_GIVE") {
      if (!data.fromAccountId) {
        ctx.addIssue({
          code: "custom",
          path: ["fromAccountId"],
          message: "Выберите счёт списания",
        });
      }
    }
    // Новый долг: нужно имя
    if (data.type === "DEBT_TAKE" || data.type === "DEBT_GIVE") {
      if (!data.personName) {
        ctx.addIssue({
          code: "custom",
          path: ["personName"],
          message: "Введите имя человека",
        });
      }
    }
    // Возврат/получение: нужен выбранный долг
    if (data.type === "DEBT_RETURN" || data.type === "DEBT_RECEIVE") {
      if (!data.debtId) {
        ctx.addIssue({
          code: "custom",
          path: ["debtId"],
          message: "Выберите долг",
        });
      }
    }
  });

export const debtDirectionSchema = z.enum(["I_OWE", "OWED_TO_ME"]);

export const debtSchema = z.object({
  direction: debtDirectionSchema,
  personName: z.string().trim().min(1, "Введите имя").max(80),
  amount,
  currency: z.string().default("RUB"),
  dueDate: z
    .union([z.coerce.date(), z.literal("").transform(() => null)])
    .optional()
    .nullable(),
  description: optionalString,
});

export const debtPaymentSchema = z.object({
  amount,
  date: z.coerce.date(),
  note: optionalString,
});

export const assetTypeSchema = z.enum([
  "REAL_ESTATE",
  "VEHICLE",
  "STOCKS",
  "CRYPTO",
  "DEPOSIT",
  "BUSINESS",
  "PRECIOUS",
  "OTHER",
]);

export const assetSchema = z.object({
  name: z.string().trim().min(1, "Введите название").max(80),
  type: assetTypeSchema,
  purchasePrice: amount,
  currentValue: z.coerce.number().nonnegative("Стоимость не может быть отрицательной"),
  currency: z.string().default("RUB"),
  purchaseDate: z.coerce.date({ message: "Укажите дату покупки" }),
  quantity: z.coerce.number().positive().optional().nullable(),
  unit: optionalString,
  description: optionalString,
});

export const assetValueSchema = z.object({
  value: z.coerce.number().nonnegative(),
  date: z.coerce.date(),
  note: optionalString,
});

export const planTypeSchema = z.enum(["PLAN_INCOME", "PLAN_EXPENSE"]);

export const planSchema = z.object({
  type: planTypeSchema,
  title: z.string().trim().min(1, "Введите название").max(120),
  amount,
  currency: z.string().default("RUB"),
  dueDate: z
    .union([z.coerce.date(), z.literal("").transform(() => null)])
    .optional()
    .nullable(),
  note: optionalString,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type DebtInput = z.infer<typeof debtSchema>;
export type DebtPaymentInput = z.infer<typeof debtPaymentSchema>;
export type AssetInput = z.infer<typeof assetSchema>;
export type AssetValueInput = z.infer<typeof assetValueSchema>;
export type PlanInput = z.infer<typeof planSchema>;
