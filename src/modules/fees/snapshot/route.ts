import { NextResponse } from "next/server";
import { getRuntime } from "@/server/application-runtime";
import { createApiError } from "@/modules/fees/domain/api-error";

export async function GET(): Promise<NextResponse> {
  const runtime = getRuntime();
  if (!runtime) {
    return NextResponse.json(
      createApiError("UNAVAILABLE", "Telemetria ainda não inicializada"),
      { status: 503 }
    );
  }

  const snapshot = await runtime.repository.getLatest(runtime.chainId);
  if (!snapshot) {
    return NextResponse.json(
      createApiError("UNAVAILABLE", "Nenhum snapshot disponível ainda"),
      { status: 503 }
    );
  }

  return NextResponse.json(snapshot);
}