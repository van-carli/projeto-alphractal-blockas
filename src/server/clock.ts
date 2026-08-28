import type { Clock } from "@/modules/fees/application/ports";

/** Implementação real: devolve a hora atual de verdade. */
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

/**
 * Implementação falsa, usada em testes. Começa em uma data fixa
 * e só avança quando o teste manda, nunca sozinha.
 */
export class FakeClock implements Clock {
  private current: Date;

  constructor(initial: Date) {
    this.current = initial;
  }

  now(): Date {
    return this.current;
  }

  /** Define a hora atual manualmente. */
  set(date: Date): void {
    this.current = date;
  }

  /** Avança o relógio em X milissegundos. */
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}