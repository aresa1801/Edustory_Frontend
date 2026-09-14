'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Calendar, Clock, ArrowRight, XCircle, CheckCircle } from 'lucide-react'

// ========== TIPE ==========
export interface SourceSlot {
  date: Date
  timeSlot: string
  subject: string
}

export interface ReschedulePayload {
  from: { date: string; time: string; subject: string }
  to: { date: string; time: string; subject: string }
}

interface RescheduleWizardProps {
  source: SourceSlot
  contractEndDate: string
  matchedSubjects: string[]
  submitting: boolean
  onCancel: () => void
  onConfirm: (payload: ReschedulePayload) => void
}

// ========== TIME SLOTS (08.00 - 19.00) ==========
const TARGET_TIME_SLOTS = [
  '08.00 - 09.00',
  '09.00 - 10.00',
  '10.00 - 11.00',
  '11.00 - 12.00',
  '12.00 - 13.00',
  '13.00 - 14.00',
  '14.00 - 15.00',
  '15.00 - 16.00',
  '16.00 - 17.00',
  '17.00 - 18.00',
  '18.00 - 19.00',
]

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatLong(d: Date): string {
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

// ========== KOMPONEN ==========
export default function RescheduleWizard({
  source,
  contractEndDate,
  matchedSubjects,
  submitting,
  onCancel,
  onConfirm,
}: RescheduleWizardProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(
    matchedSubjects.length === 1 ? matchedSubjects[0] : null
  )
  const [showConfirm, setShowConfirm] = useState(false)

  // Generate tanggal dari hari ini s.d. akhir kontrak
  const availableDates = useMemo(() => {
    const dates: Date[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const end = new Date(contractEndDate)
    end.setHours(0, 0, 0, 0)
    const current = new Date(today)
    while (current <= end && dates.length < 90) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    return dates
  }, [contractEndDate])

  const isReady = !!selectedDate && !!selectedTime && !!selectedSubject

  const handleNext = () => {
    if (!isReady) return
    setShowConfirm(true)
  }

  const handleConfirmFinal = () => {
    if (!selectedDate || !selectedTime || !selectedSubject) return
    onConfirm({
      from: {
        date: formatDateKey(source.date),
        time: source.timeSlot,
        subject: source.subject,
      },
      to: {
        date: formatDateKey(selectedDate),
        time: selectedTime,
        subject: selectedSubject,
      },
    })
  }

  return (
    <>
      <Card className="border-primary/50 ring-2 ring-primary/30 shadow-xl">
        <CardContent className="p-4 space-y-4">
          {/* HEADER */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-semibold text-lg">
                Pilih Jadwal Baru
              </h3>
              <p className="text-xs text-muted-foreground">
                Pilih tanggal, jam, dan mata pelajaran pengganti
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="gap-1.5 text-muted-foreground"
            >
              <XCircle className="w-4 h-4" />
              Batal
            </Button>
          </div>

          {/* SOURCE INFO */}
          <div className="p-3 rounded-md bg-muted/50 border border-border text-sm">
            <p className="text-xs text-muted-foreground mb-1">Jadwal yang dipindah:</p>
            <p className="font-medium">
              {formatLong(source.date)}, {source.timeSlot} ({source.subject})
            </p>
          </div>

          {/* MATA PELAJARAN (kalau > 1) */}
          {matchedSubjects.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Pilih Mata Pelajaran
              </p>
              <div className="flex flex-wrap gap-2">
                {matchedSubjects.map((subj) => {
                  const isActive = selectedSubject === subj
                  return (
                    <Button
                      key={subj}
                      type="button"
                      size="sm"
                      variant={isActive ? 'default' : 'outline'}
                      onClick={() => setSelectedSubject(subj)}
                      className="text-xs capitalize"
                    >
                      {subj}
                      {isActive && ' ✓'}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {/* TANGGAL */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Pilih Tanggal
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {availableDates.map((date) => {
                const isActive =
                  selectedDate &&
                  formatDateKey(selectedDate) === formatDateKey(date)
                return (
                  <button
                    key={formatDateKey(date)}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`shrink-0 w-20 py-2 rounded-md border text-center text-xs transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border hover:bg-muted'
                    }`}
                  >
                    <div className="font-semibold">
                      {date.getDate()}
                    </div>
                    <div className="opacity-70">
                      {date.toLocaleDateString('id-ID', {
                        month: 'short',
                      })}
                    </div>
                    <div className="opacity-60 text-[10px]">
                      {date.toLocaleDateString('id-ID', {
                        weekday: 'short',
                      })}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* JAM */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Pilih Jam
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {TARGET_TIME_SLOTS.map((slot) => {
                const isActive = selectedTime === slot
                return (
                  <Button
                    key={slot}
                    type="button"
                    size="sm"
                    variant={isActive ? 'default' : 'outline'}
                    onClick={() => setSelectedTime(slot)}
                    className="text-xs"
                  >
                    {slot}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* LANJUT */}
          <div className="flex justify-end pt-2 border-t">
            <Button
              onClick={handleNext}
              disabled={!isReady}
              className="gap-1.5"
            >
              Lanjut
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== MODAL KONFIRMASI ===== */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajukan Perpindahan Jadwal?</DialogTitle>
            <DialogDescription>
              Periksa detail perpindahan di bawah ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* FROM */}
            <div className="p-3 rounded-md border border-red-500/30 bg-red-500/5">
              <p className="text-xs text-muted-foreground mb-1">
                Jadwal Lama
              </p>
              <p className="font-medium text-sm">
                {formatLong(source.date)}
              </p>
              <p className="text-sm">
                {source.timeSlot}{' '}
                <Badge variant="outline" className="text-[10px] ml-1">
                  {source.subject}
                </Badge>
              </p>
            </div>

            <div className="flex justify-center">
              <ArrowRight className="w-5 h-5 text-primary rotate-90 sm:rotate-0" />
            </div>

            {/* TO */}
            <div className="p-3 rounded-md border border-green-500/30 bg-green-500/5">
              <p className="text-xs text-muted-foreground mb-1">
                Jadwal Baru
              </p>
              <p className="font-medium text-sm">
                {selectedDate && formatLong(selectedDate)}
              </p>
              <p className="text-sm">
                {selectedTime}{' '}
                <Badge variant="outline" className="text-[10px] ml-1">
                  {selectedSubject}
                </Badge>
              </p>
            </div>

            <p className="text-xs text-muted-foreground italic">
              Permintaan akan dikirim ke tutor. Jika tidak direspons dalam 2
              hari, permintaan otomatis hangus.
            </p>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={submitting}
            >
              Pikirkan Lagi
            </Button>
            <Button
              onClick={handleConfirmFinal}
              disabled={submitting}
              className="gap-1.5"
            >
              {submitting ? (
                <Spinner className="w-4 h-4" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Konfirmasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}