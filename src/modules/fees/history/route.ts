import { NextResponse, type NextRequest } from "next/server";
import { getRuntime } from "@/server/application-runtime";
import { createApiError } from "@/modules/fees/domain/api-error";

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 50;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const runtime = getRuntime();
  if (!runtime) {
    return NextResponse.json(
      createApiError("UNAVAILABLE", "Telemetria ainda não inicializada"),
      { status: 503 }
    );
  }

  const params = request.nextUrl.searchParams;

  const rawLimit = params.get("limit");
  const limit = rawLimit ? Math.min(parseInt(rawLimit, 10), MAX_LIMIT) : DEFAULT_LIMIT;

  if (isNaN(limit) || limit <= 0) {
    return NextResponse.json(
      createApiError("BAD_REQUEST", "Parâmetro 'limit' deve ser um número positivo"),
      { status: 400 }
    );
  }

  const fromParam = params.get("from");
  const toParam = params.get("to");

  const history = await runtime.repository.getHistory({
    chainId: runtime.chainId,
    limit,
    from: fromParam ? new Date(fromParam) : undefined,
    to: toParam ? new Date(toParam) : undefined,
  });

  return NextResponse.json(history);
}