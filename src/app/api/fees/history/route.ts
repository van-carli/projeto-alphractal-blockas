import { NextResponse, type NextRequest } from "next/server";
import { getRuntime } from "@/server/application-runtime";
import { createApiError } from "@/modules/fees/domain/api-error";
import { parseHistoryQuery } from "./query";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const runtime = getRuntime();
  if (!runtime) {
    return NextResponse.json(
      createApiError("UNAVAILABLE", "Telemetria ainda não inicializada"),
      { status: 503 }
    );
  }

  const query = parseHistoryQuery(request.nextUrl.searchParams);
  if (!query.success) {
    return NextResponse.json(
      createApiError("BAD_REQUEST", query.message),
      { status: 400 }
    );
  }

  const history = await runtime.repository.getHistory({
    chainId: runtime.chainId,
    ...query.value,
  });

  return NextResponse.json(history);
}
