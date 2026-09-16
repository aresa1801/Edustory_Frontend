'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import {
  FolderOpen,
  Folder,
  Upload,
  Download,
  Trash2,
  FileText,
  Image as ImageIcon,
  FileVideo,
  FileArchive,
  File as FileIcon,
  X,
  Lock,
} from 'lucide-react'

interface FilekuCardProps {
  matchId: string
  role: 'tutor' | 'student'
  userId: string // auth user id
}

interface FileItem {
  id: string
  match_id: string
  folder: string
  uploader_id: string
  uploader_role: 'tutor' | 'student'
  filename: string
  storage_path: string
  file_size: number
  mime_type: string
  created_at: string
  signed_url: string | null
}

// ===== FOLDER CONFIG PER ROLE =====
function getFoldersForRole(role: 'tutor' | 'student') {
  if (role === 'tutor') {
    return [
      { key: 'tutor_private', label: 'Pribadi Saya', private: true },
      { key: 'tugas_1', label: 'Tugas 1', private: false },
      { key: 'tugas_2', label: 'Tugas 2', private: false },
      { key: 'tugas_3', label: 'Tugas 3', private: false },
    ]
  }
  return [
    { key: 'student_private', label: 'Pribadi Saya', private: true },
    { key: 'tugas_1', label: 'Tugas 1', private: false },
    { key: 'tugas_2', label: 'Tugas 2', private: false },
    { key: 'tugas_3', label: 'Tugas 3', private: false },
  ]
}

function formatFileSize(bytes: number) {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i++
  }
  return `${size.toFixed(1)} ${units[i]}`
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function getFileIcon(mimeType: string) {
  if (!mimeType) return <FileIcon className="w-4 h-4 text-slate-400" />
  if (mimeType.startsWith('image/'))
    return <ImageIcon className="w-4 h-4 text-blue-400" />
  if (mimeType.startsWith('video/'))
    return <FileVideo className="w-4 h-4 text-purple-400" />
  if (mimeType.includes('zip') || mimeType.includes('compressed'))
    return <FileArchive className="w-4 h-4 text-yellow-400" />
  if (mimeType === 'application/pdf')
    return <FileText className="w-4 h-4 text-red-400" />
  return <FileText className="w-4 h-4 text-slate-400" />
}

// ========== KOMPONEN ==========
export default function FilekuCard({ matchId, role, userId }: FilekuCardProps) {
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState<FileItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [activeFolder, setActiveFolder] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const folders = getFoldersForRole(role)

  // ===== FETCH FILES =====
  const fetchFiles = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(
        `/api/match-files?match_id=${matchId}&user_id=${userId}&role=${role}`,
        { cache: 'no-store' }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Gagal memuat file')
      }
      const data = await res.json()
      setFiles(data.files || [])
      setCounts(data.counts || {})
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (matchId && userId) fetchFiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, userId, role])

  // ===== UPLOAD =====
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeFolder) return

    try {
      setUploading(true)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('match_id', matchId)
      fd.append('folder', activeFolder)
      fd.append('user_id', userId)
      fd.append('role', role)

      const res = await fetch('/api/match-files/upload', {
        method: 'POST',
        body: fd,
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal upload')

      await fetchFiles()
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ===== DELETE =====
  const handleDelete = async (fileId: string) => {
    if (!confirm('Hapus file ini?')) return
    try {
      setDeletingId(fileId)
      const res = await fetch(
        `/api/match-files/${fileId}?user_id=${userId}&role=${role}`,
        { method: 'DELETE' }
      )
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal hapus')
      await fetchFiles()
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  // ===== FILES UNTUK FOLDER AKTIF =====
  const activeFolderInfo = folders.find((f) => f.key === activeFolder)
  const activeFiles = activeFolder
    ? files.filter((f) => f.folder === activeFolder)
    : []

  // ========== RENDER ==========
  return (
    <>
      <Card data-reschedule-keep="true" className="relative z-10">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-500" />
            Fileku
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Spinner className="w-4 h-4" />
              <span className="ml-2 text-sm text-muted-foreground">
                Memuat file...
              </span>
            </div>
          ) : error ? (
            <p className="text-sm text-red-400 italic text-center py-4">
              ❌ {error}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {folders.map((folder) => {
                const count = counts[folder.key] || 0
                return (
                  <button
                    key={folder.key}
                    type="button"
                    onClick={() => setActiveFolder(folder.key)}
                    className="group flex flex-col items-start gap-2 p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-colors text-left"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="w-8 h-8 rounded-md bg-indigo-500/15 flex items-center justify-center">
                        {folder.private ? (
                          <Lock className="w-4 h-4 text-amber-400" />
                        ) : (
                          <Folder className="w-4 h-4 text-indigo-400" />
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono"
                      >
                        {count}
                      </Badge>
                    </div>
                    <div className="min-w-0 w-full">
                      <p className="text-sm font-medium truncate">
                        {folder.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {folder.private ? 'Private' : 'Shared'}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== DIALOG FOLDER ===== */}
      <Dialog
        open={!!activeFolder}
        onOpenChange={(open) => !open && setActiveFolder(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {activeFolderInfo?.private ? (
                <Lock className="w-4 h-4 text-amber-400" />
              ) : (
                <Folder className="w-4 h-4 text-indigo-400" />
              )}
              {activeFolderInfo?.label}
              <Badge variant="outline" className="text-xs ml-1">
                {activeFiles.length} file
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {activeFolderInfo?.private
                ? 'Folder pribadi — hanya kamu yang bisa melihat'
                : 'Folder tugas — bisa dilihat oleh guru & murid'}
            </DialogDescription>
          </DialogHeader>

          {/* UPLOAD */}
          <div className="flex items-center gap-2 py-2 border-b">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.zip,.mp4"
            />
            <Button
              size="sm"
              onClick={handleUploadClick}
              disabled={uploading}
              className="gap-1.5"
            >
              {uploading ? (
                <Spinner className="w-3.5 h-3.5" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              {uploading ? 'Mengupload...' : 'Upload File'}
            </Button>
            <p className="text-xs text-muted-foreground">
              Max 25MB · PDF, DOC, XLS, PPT, JPG, PNG, ZIP, MP4
            </p>
          </div>

          {/* FILE LIST */}
          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {activeFiles.length === 0 ? (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground italic">
                  Belum ada file di folder ini.
                </p>
              </div>
            ) : (
              activeFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-2 rounded-md border border-border bg-muted/10"
                >
                  <div className="w-9 h-9 rounded-md bg-muted/40 flex items-center justify-center shrink-0">
                    {getFileIcon(file.mime_type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {file.filename}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>·</span>
                      <span>{formatDate(file.created_at)}</span>
                      <span>·</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          file.uploader_role === 'tutor'
                            ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                            : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                        }`}
                      >
                        {file.uploader_role === 'tutor' ? 'Guru' : 'Murid'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {file.signed_url && (
                      <a
                        href={file.signed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={file.filename}
                      >
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-blue-400 hover:text-blue-500"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </Button>
                      </a>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-red-400 hover:text-red-500"
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingId === file.id}
                      title="Hapus"
                    >
                      {deletingId === file.id ? (
                        <Spinner className="w-3.5 h-3.5" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveFolder(null)}>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}