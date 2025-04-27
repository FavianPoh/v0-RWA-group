export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(" ")
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export function calculateCorrelation(ttcPD: number): number {
  // Basel formula for correlation
  const baseCorrelation =
    (0.12 * (1 - Math.exp(-50 * ttcPD))) / (1 - Math.exp(-50)) +
    0.24 * (1 - (1 - Math.exp(-50 * ttcPD)) / (1 - Math.exp(-50)))

  // Apply AVC multiplier
  const finalCorrelation = baseCorrelation //* avcMultiplier  AVC multiplier is already applied in rwa-calculator.ts

  // Ensure correlation is between 0 and 1
  return Math.max(0, Math.min(1, finalCorrelation))
}
