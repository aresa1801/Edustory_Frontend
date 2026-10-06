// lib/payouts.ts
//
// Helper payout ke Midtrans Iris (Payouts API) + util saldo pengajar.
// Dipakai oleh:
//   - app/api/payouts/create       (dipanggil dari panel admin saat approve)
//   - app/api/admin/withdrawals    (approve → kirim ke Midtrans kalau aktif)
//
// Kalau MIDTRANS_IRIS_API_KEY belum di-set, payout dianggap MANUAL:
// admin transfer sendiri ke rekening pengajar, lalu menandai "completed".

import type { SupabaseClient } from '@supabase/supabase-js'

export const MIDTRANS_IRIS_ENABLED = !!process.env.MIDTRANS_IRIS_API_KEY

export interface IrisPayoutResult {
  ok: boolean
  referenceNo?: string
  error?: string
  raw?: any
}

/**
 * Kirim satu payout ke Midtrans Iris.
 * Midtrans membalas `payouts[0].reference_no` yang dipakai untuk webhook.
 */
export async function createIrisPayout(args: {
  withdrawalId: string
  amount: number
  bankCode: string
  accountNumber: string
  accountName: string
}): Promise<IrisPayoutResult> {
  if (!MIDTRANS_IRIS_ENABLED) {
    return { ok: false, error: 'MIDTRANS_IRIS_API_KEY belum dikonfigurasi' }
  }

  const payload = {
    payouts: [
      {
        beneficiary_name: args.accountName,
        beneficiary_account: args.accountNumber,
        beneficiary_bank: args.bankCode,
        amount: Number(args.amount).toFixed(2),
        notes: `Withdrawal #${args.withdrawalId.slice(0, 8)}`,
      },
    ],
  }

  const authString = Buffer.from(`${process.env.MIDTRANS_IRIS_API_KEY}:`).toString('base64')

  try {
    const response = await fetch('https://api.midtrans.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Basic ${authString}`,
        'X-Idempotency-Key': `withdrawal-${args.withdrawalId}`,
      },
      body: JSON.stringify(payload),
    })

    const result: any = await response.json()

    if (!response.ok) {
      console.error('[iris] payout error:', result)
      return {
        ok: false,
        error: result?.error_message || result?.messages?.[0] || `HTTP ${response.status}`,
        raw: result,
      }
    }

    const referenceNo = result?.payouts?.[0]?.reference_no
    if (!referenceNo) {
      return { ok: false, error: 'Midtrans tidak mengembalikan reference_no', raw: result }
    }

    return { ok: true, referenceNo, raw: result }
  } catch (err: any) {
    console.error('[iris] fetch error:', err)
    return { ok: false, error: err?.message || 'Network error' }
  }
}

// ============================================================
// Saldo pengajar
// ============================================================

export interface TutorBalances {
  /** Saldo tercatat di wallets.balance */
  balance: number
  /** Dana yang sedang ditahan untuk penarikan berjalan (pending/processing) */
  hold: number
  /** Saldo yang benar-benar bisa ditarik */
  available: number
}

/**
 * Hitung saldo pengajar.
 * Model penarikan: saat pengajar mengajukan tarik saldo, dibuat baris
 * wallet_transactions `type='withdrawal'` status `pending` (amount negatif)
 * yang berfungsi sebagai "penahan". Saldo wallets.balance baru benar-benar
 * dikurangi saat penarikan selesai (completed).
 */
export async function getTutorBalances(
  supabase: SupabaseClient,
  tutorId: string
): Promise<TutorBalances> {
  const { data: wallet } = await supabase
    .from('wallets')
    .select('balance')
    .eq('tutor_id', tutorId)
    .maybeSingle()

  const balance = Number(wallet?.balance) || 0

  const { data: holds } = await supabase
    .from('wallet_transactions')
    .select('amount')
    .eq('tutor_id', tutorId)
    .eq('type', 'withdrawal')
    .in('status', ['pending', 'processing'])

  const hold = (holds || []).reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount) || 0), 0)

  return { balance, hold, available: Math.max(0, balance - hold) }
}

/**
 * Cari withdrawal yang masih menahan saldo untuk sebuah user (tutor).
 */
export async function findActiveWithdrawalHold(
  supabase: SupabaseClient,
  tutorId: string,
  withdrawalId: string
) {
  const { data } = await supabase
    .from('wallet_transactions')
    .select('id, amount, status, balance_after')
    .eq('tutor_id', tutorId)
    .eq('type', 'withdrawal')
    .eq('reference', withdrawalId)
    .in('status', ['pending', 'processing'])
    .maybeSingle()
  return data as { id: string; amount: number; status: string; balance_after: number } | null
}
