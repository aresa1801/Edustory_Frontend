'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { AlertCircle, Play, Copy, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ExecutionResult {
  success: boolean
  data?: any[]
  error?: string
  rowCount?: number
  executionTime?: number
}

export default function SQLEditorPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ExecutionResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const executeQuery = async () => {
    if (!query.trim()) {
      setResults({
        success: false,
        error: 'Silakan masukkan query SQL',
      })
      return
    }

    setLoading(true)
    setResults(null)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        setResults({
          success: false,
          error: 'Silakan login terlebih dahulu',
        })
        return
      }

      const response = await fetch('/api/admin/sql-execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      })

      const json = await response.json()

      if (!response.ok) {
        setResults({
          success: false,
          error: json.error || 'Gagal menjalankan query',
        })
      } else {
        setResults({
          success: true,
          data: json.data || [],
          rowCount: json.rowCount,
          executionTime: json.executionTime,
        })
      }
    } catch (error) {
      setResults({
        success: false,
        error: error instanceof Error ? error.message : 'Terjadi kesalahan',
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(results?.data || [], null, 2))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground mb-1">SQL Editor</h1>
        <p className="text-muted-foreground text-sm">
          Jalankan query SQL untuk mengelola database Supabase. Hanya admin yang dapat mengakses fitur ini.
        </p>
      </div>

      {/* Warning */}
      <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
          Hati-hati! Query yang salah dapat merusak data. Pastikan Anda yakin sebelum menjalankan perintah INSERT, UPDATE, atau DELETE.
        </AlertDescription>
      </Alert>

      {/* Editor Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Query SQL</CardTitle>
          <CardDescription>Masukkan perintah SQL yang ingin dijalankan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="SELECT * FROM user_profiles LIMIT 10;"
            className="w-full h-48 border border-border rounded-lg px-3 py-2 text-sm bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
          />
          <div className="flex justify-end">
            <Button
              onClick={executeQuery}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Spinner className="w-3.5 h-3.5" />
                  Menjalankan...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Jalankan Query
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Hasil Eksekusi</CardTitle>
                {results.executionTime !== undefined && (
                  <CardDescription>
                    Waktu eksekusi: {results.executionTime}ms
                    {results.rowCount !== undefined && ` • ${results.rowCount} baris`}
                  </CardDescription>
                )}
              </div>
              {results.success && results.data && results.data.length > 0 && (
                <Button
                  onClick={copyToClipboard}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Disalin
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Salin
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent>
            {!results.success ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-mono text-sm">
                  {results.error}
                </AlertDescription>
              </Alert>
            ) : results.data && results.data.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {Object.keys(results.data[0]).map(key => (
                        <th
                          key={key}
                          className="text-left px-4 py-2 font-semibold text-foreground bg-muted/50"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {results.data.map((row, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-muted/50">
                        {Object.values(row).map((val, colIdx) => (
                          <td key={colIdx} className="px-4 py-2 text-muted-foreground">
                            <span className="font-mono text-xs">
                              {typeof val === 'object'
                                ? JSON.stringify(val)
                                : val === null
                                ? 'NULL'
                                : String(val)}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  Query berhasil dijalankan (tidak ada data untuk ditampilkan)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Usage Tips */}
      <Card className="bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Tips Penggunaan</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-2">
          <p>• <strong>SELECT queries:</strong> Gunakan LIMIT untuk membatasi hasil besar</p>
          <p>• <strong>INSERT/UPDATE/DELETE:</strong> Gunakan WHERE clause untuk spesifisitas</p>
          <p>• <strong>Transactions:</strong> Tidak didukung, setiap query dijalankan terpisah</p>
          <p>• <strong>Case sensitivity:</strong> Query SQL tidak case-sensitive untuk keywords, tapi case-sensitive untuk data</p>
        </CardContent>
      </Card>
    </div>
  )
}
