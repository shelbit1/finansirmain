"use client";

import { useState, type FormEvent } from "react";
import type { AssetType, DebtDirection, TransactionType } from "@prisma/client";
import { cn, formatMoney, toInputDate } from "@/lib/utils";
import {
  DEBT_LABELS,
  DEBT_TYPES,
  debtColor,
  isDebtType,
  type DebtType,
} from "@/lib/transactionMeta";
import { ASSET_TYPE_LIST } from "@/lib/assetTypes";

/** Ширина модалки с формой операции — все 5 вкладок помещаются в одну строку */
export const TRANSACTION_MODAL_MAX_WIDTH = "max-w-2xl";

export type TransactionDto = {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  note: string | null;
  incomeCategoryId: string | null;
  expenseCategoryId: string | null;
  fromAccountId: string | null;
  toAccountId: string | null;
  interestAmount?: number | null;
  personName?: string | null;
  debtId?: string | null;
  assetId?: string | null;
  assetName?: string | null;
  assetType?: AssetType | null;
};

export type AccountOption = { id: string; name: string; icon: string | null };
export type CategoryOption = { id: string; name: string; icon: string | null };
export type DebtOption = {
  id: string;
  direction: DebtDirection;
  personName: string;
  amount: number;
  remaining: number;
  currency: string;
};

type TopTab = "INCOME" | "EXPENSE" | "TRANSFER" | "DEBT" | "ASSET_BUY";

const TOP_TABS: { id: TopTab; label: string; color: string }[] = [
  { id: "INCOME", label: "Доход", color: "var(--color-income)" },
  { id: "EXPENSE", label: "Расход", color: "var(--color-expense)" },
  { id: "TRANSFER", label: "Перемещение", color: "var(--color-transfer)" },
  { id: "DEBT", label: "Долг", color: "var(--color-debt-owe)" },
  { id: "ASSET_BUY", label: "Актив", color: "var(--color-asset)" },
];

function topTabForType(t: TransactionType): TopTab {
  if (isDebtType(t)) return "DEBT";
  if (t === "INCOME") return "INCOME";
  if (t === "TRANSFER") return "TRANSFER";
  if (t === "ASSET_BUY") return "ASSET_BUY";
  return "EXPENSE";
}

export function TransactionForm({
  transaction,
  accounts,
  incomeCategories,
  expenseCategories,
  debts,
  personNames = [],
  onSuccess,
}: {
  transaction?: TransactionDto;
  accounts: AccountOption[];
  incomeCategories: CategoryOption[];
  expenseCategories: CategoryOption[];
  debts: DebtOption[];
  personNames?: string[];
  onSuccess: () => void;
}) {
  const isEdit = Boolean(transaction);

  const [tab, setTab] = useState<TopTab>(
    transaction ? topTabForType(transaction.type) : "EXPENSE",
  );
  const [debtType, setDebtType] = useState<DebtType>(
    transaction && isDebtType(transaction.type) ? (transaction.type as DebtType) : "DEBT_TAKE",
  );
  const [assetType, setAssetType] = useState<AssetType>("REAL_ESTATE");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const effectiveType: TransactionType =
    tab === "DEBT" ? debtType : (tab as TransactionType);

  const isNewDebt = effectiveType === "DEBT_TAKE" || effectiveType === "DEBT_GIVE";
  const isDebtPayment =
    effectiveType === "DEBT_RETURN" || effectiveType === "DEBT_RECEIVE";
  const isAssetBuy = effectiveType === "ASSET_BUY";
  const isAssetBuyCreate = isAssetBuy && !isEdit;
  const debtChoices = debts.filter((d) =>
    effectiveType === "DEBT_RETURN"
      ? d.direction === "I_OWE"
      : effectiveType === "DEBT_RECEIVE"
      ? d.direction === "OWED_TO_ME"
      : false,
  );
  const needsFromAccount =
    effectiveType === "EXPENSE" ||
    effectiveType === "TRANSFER" ||
    effectiveType === "DEBT_RETURN" ||
    effectiveType === "DEBT_GIVE" ||
    effectiveType === "ASSET_BUY";
  const needsToAccount =
    effectiveType === "INCOME" ||
    effectiveType === "TRANSFER" ||
    effectiveType === "DEBT_TAKE" ||
    effectiveType === "DEBT_RECEIVE";

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    const fd = new FormData(e.currentTarget);
    const payload = {
      type: effectiveType,
      amount: Number(fd.get("amount") ?? 0),
      date: String(fd.get("date") ?? new Date().toISOString().slice(0, 10)),
      note: String(fd.get("note") ?? "") || undefined,
      incomeCategoryId:
        effectiveType === "INCOME"
          ? String(fd.get("incomeCategoryId") ?? "") || null
          : null,
      expenseCategoryId:
        effectiveType === "EXPENSE"
          ? String(fd.get("expenseCategoryId") ?? "") || null
          : null,
      fromAccountId: needsFromAccount
        ? String(fd.get("fromAccountId") ?? "") || null
        : null,
      toAccountId: needsToAccount
        ? String(fd.get("toAccountId") ?? "") || null
        : null,
      interestAmount:
        effectiveType === "DEBT_RETURN"
          ? Number(fd.get("interestAmount") ?? 0) || 0
          : null,
      personName: isNewDebt ? String(fd.get("personName") ?? "").trim() || null : null,
      debtId: isDebtPayment ? String(fd.get("debtId") ?? "") || null : null,
      assetData: isAssetBuyCreate
        ? {
            name: String(fd.get("assetName") ?? "").trim(),
            type: assetType,
            currency: String(fd.get("assetCurrency") ?? "RUB"),
          }
        : null,
    };

    try {
      const url = isEdit ? `/api/transactions/${transaction!.id}` : "/api/transactions";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? "Не удалось сохранить");
      }
      onSuccess();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  const accountsEmpty = accounts.length === 0;
  const noDebtChoices = isDebtPayment && !isEdit && debtChoices.length === 0;

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex gap-1.5 p-1.5 bg-bg border border-border rounded-xl w-full">
        {TOP_TABS.map((t) => (
          <button
            type="button"
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 min-w-0 py-2 px-1 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap text-center transition-colors",
              tab === t.id
                ? "bg-surface shadow-sm"
                : "text-text-muted hover:text-text",
            )}
            style={tab === t.id ? { color: t.color } : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "DEBT" && (
        <div>
          <label className="label">Тип операции с долгом</label>
          <select
            value={debtType}
            onChange={(e) => setDebtType(e.target.value as DebtType)}
            disabled={isEdit}
            className="input"
            style={{ color: debtColor(debtType) }}
          >
            {DEBT_TYPES.map((d) => (
              <option key={d} value={d}>
                {DEBT_LABELS[d]}
              </option>
            ))}
          </select>
          {isEdit && (
            <p className="text-xs text-text-muted mt-1">
              Тип долговой операции изменить нельзя — удалите и создайте заново.
            </p>
          )}
        </div>
      )}

      {isNewDebt && (
        <div>
          <label className="label">Имя человека</label>
          <input
            name="personName"
            type="text"
            required
            maxLength={80}
            defaultValue={transaction?.personName ?? ""}
            placeholder="Например: Дима"
            className="input"
            list={personNames.length > 0 ? "debt-person-names" : undefined}
            autoComplete="off"
          />
          {personNames.length > 0 && (
            <datalist id="debt-person-names">
              {personNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          )}
          <p className="text-xs text-text-muted mt-1">
            {personNames.length > 0
              ? "Можно выбрать из списка или ввести новое имя. Долг автоматически появится в разделе «Долги»."
              : "Долг автоматически появится в разделе «Долги»."}
          </p>
        </div>
      )}

      {isDebtPayment && (
        <div>
          <label className="label">Долг</label>
          {debtChoices.length === 0 && !isEdit ? (
            <p className="text-text-muted text-sm bg-bg border border-border rounded-lg px-3 py-2">
              Нет подходящих долгов. Сначала добавьте операцию «
              {effectiveType === "DEBT_RETURN" ? "Я взял в долг" : "У меня взяли в долг"}
              ».
            </p>
          ) : (
            <select
              name="debtId"
              required
              defaultValue={transaction?.debtId ?? ""}
              disabled={isEdit}
              className="input"
            >
              <option value="">Выберите долг</option>
              {debtChoices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.personName} — остаток {formatMoney(d.remaining, d.currency)}
                </option>
              ))}
              {/* при редактировании показываем текущую запись, даже если она уже не активна */}
              {isEdit &&
                transaction?.debtId &&
                !debtChoices.some((d) => d.id === transaction.debtId) && (
                  <option value={transaction.debtId}>
                    {transaction.personName ?? "Текущий долг"}
                  </option>
                )}
            </select>
          )}
          {isEdit && (
            <p className="text-xs text-text-muted mt-1">
              Долг, к которому относится возврат, изменить нельзя.
            </p>
          )}
        </div>
      )}

      {isAssetBuyCreate && (
        <>
          <div>
            <label className="label">Название актива</label>
            <input
              name="assetName"
              type="text"
              required
              maxLength={80}
              placeholder="Квартира на Ленина / BTC / Tesla"
              className="input"
              autoComplete="off"
            />
          </div>

          <div>
            <label className="label">Тип актива</label>
            <div className="grid grid-cols-4 gap-1.5">
              {ASSET_TYPE_LIST.map(([key, info]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setAssetType(key)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg border text-xs",
                    assetType === key
                      ? "border-primary bg-primary/10"
                      : "border-border bg-bg",
                  )}
                >
                  <span className="text-lg">{info.emoji}</span>
                  <span className="leading-tight text-center">{info.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Валюта актива</label>
            <select name="assetCurrency" defaultValue="RUB" className="input">
              <option value="RUB">₽ RUB</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
            </select>
          </div>
        </>
      )}

      {isAssetBuy && isEdit && (
        <p className="text-text-muted text-sm bg-bg border border-border rounded-lg px-3 py-2">
          Поля актива (название, тип, текущая стоимость) меняются в разделе
          «Активы». Здесь можно изменить сумму покупки, дату и счёт списания.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">
            {effectiveType === "DEBT_RETURN"
              ? "Тело долга"
              : isAssetBuy
              ? "Цена покупки"
              : "Сумма"}
          </label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            required
            defaultValue={transaction?.amount ?? ""}
            placeholder="0,00"
            className="input tnum"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Дата</label>
          <input
            name="date"
            type="date"
            required
            defaultValue={transaction ? toInputDate(transaction.date) : toInputDate(new Date())}
            className="input"
          />
        </div>
      </div>

      {effectiveType === "DEBT_RETURN" && (
        <div>
          <label className="label">% долга (попадёт в расходы)</label>
          <input
            name="interestAmount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            defaultValue={transaction?.interestAmount ?? ""}
            placeholder="0,00"
            className="input tnum"
          />
          <p className="text-xs text-text-muted mt-1">
            Будет создана связанная операция расхода в категории «Проценты по долгу».
          </p>
        </div>
      )}

      {needsFromAccount && (
        <div>
          <label className="label">
            {effectiveType === "TRANSFER"
              ? "Откуда"
              : isAssetBuy
              ? "Счёт оплаты"
              : "Счёт списания"}
          </label>
          <select
            name="fromAccountId"
            required
            defaultValue={transaction?.fromAccountId ?? ""}
            className="input"
          >
            <option value="">Выберите счёт</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon ?? ""} {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {needsToAccount && (
        <div>
          <label className="label">
            {effectiveType === "TRANSFER" ? "Куда" : "Счёт зачисления"}
          </label>
          <select
            name="toAccountId"
            required
            defaultValue={transaction?.toAccountId ?? ""}
            className="input"
          >
            <option value="">Выберите счёт</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.icon ?? ""} {a.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {effectiveType === "INCOME" && (
        <div>
          <label className="label">Статья дохода</label>
          <select
            name="incomeCategoryId"
            required
            defaultValue={transaction?.incomeCategoryId ?? ""}
            className="input"
          >
            <option value="">Выберите статью</option>
            {incomeCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ?? ""} {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {effectiveType === "EXPENSE" && (
        <div>
          <label className="label">Статья расхода</label>
          <select
            name="expenseCategoryId"
            required
            defaultValue={transaction?.expenseCategoryId ?? ""}
            className="input"
          >
            <option value="">Выберите статью</option>
            {expenseCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon ?? ""} {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="label">Заметка</label>
        <input
          name="note"
          type="text"
          maxLength={500}
          defaultValue={transaction?.note ?? ""}
          placeholder="Необязательно"
          className="input"
        />
      </div>

      {accountsEmpty && (
        <p className="text-text-muted text-sm bg-bg border border-border rounded-lg px-3 py-2">
          Сначала создайте хотя бы один счёт.
        </p>
      )}
      {error && (
        <p className="text-expense text-sm bg-expense/8 border border-expense/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || accountsEmpty || noDebtChoices}
        className="btn btn-primary w-full"
      >
        {pending ? "Сохраняем…" : isEdit ? "Сохранить" : "Добавить операцию"}
      </button>
    </form>
  );
}
