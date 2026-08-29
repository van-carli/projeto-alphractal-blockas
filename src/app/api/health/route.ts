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

  const health = runtime.feeService.getHealth();

  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

  return NextResponse.json(health, { status: statusCode });
}