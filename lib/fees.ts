// lib/fees.ts
//
// Single source of truth untuk pembagian hasil sesi belajar.
// Sebelumnya nilai 10% di-hardcode & tersebar di beberapa file
// (app/api/sessions/[sessionId]/complete, lib/auto-complete), sehingga
// tidak konsisten dengan tabel tier di lib/credit.ts (10% / 20%).
//
// Ambang default bisa diatur lewat env PLATFORM_FEE_PERCENT (default 10).

export const PLATFORM_FEE_PERCENT: number =
  Number(process.env.PLATFORM_FEE_PERCENT ?? 10) || 10

export interface FeeBreakdown {
  /** Harga satu sesi (dibayar siswa). */
  rate: number
  /** Bagian platform. */
  fee: number
  /** Bagian pengajar (rate - fee). */
  tutorEarning: number
  /** Persentase fee yang dipakai. */
  feePercent: number
}

/**
 * Hitung pembagian fee satu sesi.
 * @param rate  harga sesi (angka apa pun, akan di-coerce ke number)
 * @param feePercent  override persentase (mis. dari tier kredit tutor). Default PLATFORM_FEE_PERCENT.
 */
export function calcSessionFee(rate: number, feePercent: number = PLATFORM_FEE_PERCENT): FeeBreakdown {
  const safeRate = Number(rate) || 0
  const percent = Number.isFinite(feePercent) ? feePercent : PLATFORM_FEE_PERCENT
  const fee = Math.round(safeRate * (percent / 100))
  return {
    rate: safeRate,
    fee,
    tutorEarning: safeRate - fee,
    feePercent: percent,
  }
}
