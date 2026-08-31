import type { SnapshotHistoryQuery } from "@/modules/fees";

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 50;

type ParsedHistoryQuery = Omit<SnapshotHistoryQuery, "chainId">;
type HistoryQueryResult =
  | Readonly<{ success: true; value: ParsedHistoryQuery }>
  | Readonly<{ success: false; message: string }>;

export function parseHistoryQuery(
  params: URLSearchParams
): HistoryQueryResult {
  const rawLimit = params.get("limit");
  let limit = DEFAULT_LIMIT;

  if (rawLimit !== null) {
    if (!/^\d+$/.test(rawLimit)) {
      return {
        success: false,
        message: "Parâmetro 'limit' deve ser um número inteiro positivo",
      };
    }

    const parsedLimit = Number(rawLimit);
    if (!Number.isSafeInteger(parsedLimit) || parsedLimit <= 0) {
      return {
        success: false,
        message: "Parâmetro 'limit' deve ser um número inteiro positivo",
      };
    }
    limit = Math.min(parsedLimit, MAX_LIMIT);
  }

  const fromResult = parseOptionalDate(params.get("from"), "from");
  if (!fromResult.success) return fromResult;
  const toResult = parseOptionalDate(params.get("to"), "to");
  if (!toResult.success) return toResult;

  if (
    fromResult.value &&
    toResult.value &&
    fromResult.value.getTime() > toResult.value.getTime()
  ) {
    return {
      success: false,
      message: "Parâmetro 'from' não pode ser posterior a 'to'",
    };
  }

  return {
    success: true,
    value: {
      limit,
      ...(fromResult.value ? { from: fromResult.value } : {}),
      ...(toResult.value ? { to: toResult.value } : {}),
    },
  };
}

function parseOptionalDate(
  value: string | null,
  parameterName: "from" | "to"
):
  | Readonly<{ success: true; value?: Date }>
  | Readonly<{ success: false; message: string }> {
  if (value === null) return { success: true };

  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) {
    return {
      success: false,
      message: `Parâmetro '${parameterName}' deve ser uma data válida`,
    };
  }

  return { success: true, value: date };
}
