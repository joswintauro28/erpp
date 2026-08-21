export { cn } from "@/lib/utils";

export function money(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function number(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}
