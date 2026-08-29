import { bootstrapServer } from "./server/bootstrap";

export async function register(): Promise<void> {
  // só roda no lado do servidor, nunca no navegador
  if (typeof window === "undefined") {
    await bootstrapServer();
  }
}