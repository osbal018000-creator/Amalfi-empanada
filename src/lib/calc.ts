import type { SaleItem, OrderItem, Payment, Sale, Order } from './types';

export function grossMarginPercent(unitPrice: number, unitCost: number): number {
  if (unitPrice <= 0) return 0;
  return ((unitPrice - unitCost) / unitPrice) * 100;
}

export function grossProfitPerUnit(unitPrice: number, unitCost: number): number {
  return unitPrice - unitCost;
}

export interface SaleTotals {
  subtotal: number;
  discount: number;
  total: number;
  totalCost: number;
  grossProfit: number;
  grossMargin: number;
  units: number;
}

export function computeSaleTotals(
  items: { quantity: number; unit_price: number; unit_cost: number }[],
  discount: number,
): SaleTotals {
  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const totalCost = items.reduce((s, it) => s + it.quantity * it.unit_cost, 0);
  const total = Math.max(0, subtotal - (discount || 0));
  const grossProfit = total - totalCost;
  const grossMargin = total > 0 ? (grossProfit / total) * 100 : 0;
  const units = items.reduce((s, it) => s + Number(it.quantity), 0);
  return { subtotal, discount: discount || 0, total, totalCost, grossProfit, grossMargin, units };
}

export function computeOrderTotals(
  items: { quantity: number; unit_price: number; unit_cost: number }[],
  discount: number,
) {
  return computeSaleTotals(items, discount);
}

export function orderBalance(total: number, payments: Payment[]): number {
  const paid = payments.reduce((s, p) => s + Number(p.amount), 0);
  return Math.max(0, total - paid);
}

export function orderPaid(payments: Payment[]): number {
  return payments.reduce((s, p) => s + Number(p.amount), 0);
}

export function sumSaleItems(items: SaleItem[]): { total: number; totalCost: number; units: number } {
  const total = items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0);
  const totalCost = items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_cost), 0);
  const units = items.reduce((s, it) => s + Number(it.quantity), 0);
  return { total, totalCost, units };
}

export function sumOrderItems(items: OrderItem[]): { total: number; totalCost: number; units: number } {
  const total = items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_price), 0);
  const totalCost = items.reduce((s, it) => s + Number(it.quantity) * Number(it.unit_cost), 0);
  const units = items.reduce((s, it) => s + Number(it.quantity), 0);
  return { total, totalCost, units };
}

export interface PeriodRange {
  start: Date;
  end: Date;
}

export function inPeriod(d: string | Date, range: PeriodRange): boolean {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date >= range.start && date <= range.end;
}

export function previousPeriod(range: PeriodRange): PeriodRange {
  const span = range.end.getTime() - range.start.getTime();
  const end = new Date(range.start.getTime() - 1);
  const start = new Date(end.getTime() - span);
  return { start, end };
}
