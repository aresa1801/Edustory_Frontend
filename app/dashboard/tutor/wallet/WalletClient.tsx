'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import {
  Wallet,
  ArrowUp,
  ArrowDown,
  History,
  Receipt,
  Info,
  CheckCircle2,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================
interface WalletTransaction {
  id: string
  amount: number
  type?: string
  transaction_type?: string
  status?: string
  description?: string
  notes?: string
  reference?: string
  reference_id?: string
  balance_after?: number
  created_at: string
}

// ============================================================
// HELPER
// ============================================================
function getTxLabel(tx: WalletTransaction): string {
  if (tx.description) return tx.description
  if (tx.notes) return tx.notes
  const t = (tx.type || tx.transaction_type || '').toLowerCase()
  const LABELS: Record<string, string> = {
    session_earning: 'Pendapatan Sesi',
    session_release: 'Pendapatan Sesi',
    refund: 'Pengembalian Dana',
    withdrawal: 'Penarikan Saldo',
    withdrawal_completed: 'Penarikan Selesai',
    credit: 'Kredit',
    debit: 'Debit',
  }
  return LABELS[t] || 'Transaksi'
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function TutorWalletClient({
  initialBalance,
  tutorId,
  tutorName,
}: {
  initialBalance: number
  tutorId: string
  tutorName: string
}) {
  const [balance, setBalance] = useState(initialBalance)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [txLoading, setTxLoading] = useState(true)

  const refreshBalance = async () => {
    if (!tutorId) return
    try {
      const res = await fetch(
        `/api/tutors/wallet-balance?tutor_id=${tutorId}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      if (res.ok) setBalance(Number(data.balance) || 0)
    } catch (err) {
      console.warn('[TutorWallet] balance error:', err)
    }
  }

  const refreshTransactions = async () => {
    if (!tutorId) {
      setTxLoading(false)
      return
    }

    setTxLoading(true)
    try {
      const res = await fetch(
        `/api/tutors/wallet-transactions?tutor_id=${tutorId}`,
        { cache: 'no-store' }
      )
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch (err) {
      console.error('[TutorWallet] tx error:', err)
      setTransactions([])
    } finally {
      setTxLoading(false)
    }
  }

  useEffect(() => {
    refreshBalance()
    refreshTransactions()
  }, [tutorId])

  // 🔥 Tutor hanya lihat transaksi yang benar-benar selesai (uang sudah masuk)
  const visibleTransactions = useMemo(() => {
    return transactions
      .filter((tx) => (tx.status || '').toLowerCase() === 'completed')
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
  }, [transactions])

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Wallet className="h-6 w-6" /> Wallet Deposit
        </h1>
        <p className="text-muted-foreground text-sm">
          Halo {tutorName}, ini adalah dompet Anda. Saldo bertambah dari hasil mengajar.
        </p>
      </div>

      {/* TWO COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT — Wallet dan Penarikan */}
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              Wallet dan Penarikan
            </h2>
          </div>

          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo Saat Ini
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold text-primary">
                Rp {balance.toLocaleString('id-ID')}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Saldo bertambah setiap kali sesi mengajar selesai (setelah dipotong fee platform).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Penarikan Saldo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed text-foreground">
                  Fitur penarikan saldo ke rekening bank akan segera hadir. Sementara ini,
                  hubungi admin untuk proses penarikan manual.
                </div>
              </div>
              <Button disabled className="w-full" variant="outline">
                Tarik Saldo (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT — Log Transaksi */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Log Transaksi</h2>
          </div>

          <Card className="flex-1 flex flex-col">
            <CardContent className="pt-6 flex-1 flex flex-col">
              {txLoading ? (
                <div className="flex flex-col items-center py-10">
                  <Spinner className="h-6 w-6" />
                  <p className="mt-2 text-xs text-muted-foreground">Memuat log...</p>
                </div>
              ) : visibleTransactions.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted/40 flex items-center justify-center mx-auto mb-3">
                    <History className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Belum ada transaksi</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pendapatan dari sesi mengajar akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 flex-1 overflow-y-auto pr-1">
                  {visibleTransactions.map((tx) => {
                    const amount = Number(tx.amount) || 0
                    const isIncome = amount > 0
                    const absAmount = Math.abs(amount)
                    const label = getTxLabel(tx)
                    const date = new Date(tx.created_at)

                    return (
                      <div
                        key={tx.id}
                        className="flex items-center justify-between rounded-xl border border-border/40 p-3 transition-colors hover:bg-muted/20"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isIncome
                                ? 'bg-secondary/15 text-secondary'
                                : 'bg-destructive/15 text-destructive'
                            }`}
                          >
                            {isIncome ? (
                              <ArrowUp className="w-4 h-4" />
                            ) : (
                              <ArrowDown className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{label}</p>
                            <p className="text-xs text-muted-foreground">
                              {date.toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}{' '}
                              ·{' '}
                              {date.toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`text-sm font-semibold flex-shrink-0 ml-2 ${
                            isIncome ? 'text-secondary' : 'text-destructive'
                          }`}
                        >
                          {isIncome ? '+' : '−'}Rp {absAmount.toLocaleString('id-ID')}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}