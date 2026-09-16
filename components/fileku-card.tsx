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
  Lock,
  FolderPlus,
  Pencil,
  Check,
  X,
} from 'lucide-react'

interface FilekuCardProps {
  matchId: string
  role: 'tutor' | 'student'
  userId: string
}

interface FolderItem {
  id: string
  match_id: string
  folder_key: string
  label: string
  is_default: boolean
  created_by: string | null
  created_at: string
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
  uploaded_by_me: boolean // <-- BARU
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

export default function FilekuCard({ matchId, role, userId }: FilekuCardProps) {
  const [loading, setLoading] = useState(true)
  const [folders, setFolders] = useState<FolderItem[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [activeFolder, setActiveFolder] = useState<FolderItem | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Rename state
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [processingRename, setProcessingRename] = useState(false)

  // Create folder state
  const [showCreateFolder, setShowCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)

  // Delete folder state
  const [showDeleteFolder, setShowDeleteFolder] = useState(false)
  const [folderToDelete, setFolderToDelete] = useState<FolderItem | null>(null)
  const [deletingFolder, setDeletingFolder] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ===== FETCH =====
  const fetchAll = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      setError(null)

      const foldersRes = await fetch(
        `/api/match-folders?match_id=${matchId}`,
        { cache: 'no-store' }
      )
      if (!foldersRes.ok) throw new Error('Gagal memuat folder')
      const foldersData = await foldersRes.json()

      const filesRes = await fetch(
        `/api/match-files?match_id=${matchId}&user_id=${userId}&role=${role}`,
        { cache: 'no-store' }
      )
      if (!filesRes.ok) throw new Error('Gagal memuat file')
      const filesData = await filesRes.json()

      setFolders(foldersData.folders || [])
      setFiles(filesData.files || [])
      setCounts(filesData.counts || {})
    } catch (err: any) {
      if (!silent) setError(err.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // ===== INITIAL FETCH + POLLING + FOCUS REFRESH (cuma 1 useEffect) =====
  useEffect(() => {
    if (!matchId || !userId) return

    fetchAll(false)

    const interval = setInterval(() => {
      fetchAll(true)
    }, 8000)

    const onFocus = () => fetchAll(true)
    window.addEventListener('focus', onFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, userId, role])

  // ===== UPLOAD =====
  const handleUploadClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeFolder) return

    try {
      setUploading(true)
      const fd = new FormData()
      fd.append('file', file)
      fd.append('match_id', matchId)
      fd.append('folder', activeFolder.folder_key)
      fd.append('user_id', userId)
      fd.append('role', role)

      const res = await fetch('/api/match-files/upload', {
        method: 'POST',
        body: fd,
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal upload')

      await fetchAll(true)
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ===== DELETE FILE =====
  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Hapus file ini?')) return
    try {
      setDeletingId(fileId)
      const res = await fetch(
        `/api/match-files/${fileId}?user_id=${userId}&role=${role}`,
        { method: 'DELETE' }
      )
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal hapus')
      await fetchAll(true)
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setDeletingId(null)
    }
  }

  // ===== RENAME FOLDER =====
  const startRename = (folder: FolderItem) => {
    setRenamingFolder(folder.id)
    setRenameValue(folder.label)
  }

  const cancelRename = () => {
    setRenamingFolder(null)
    setRenameValue('')
  }

  const submitRename = async (folder: FolderItem) => {
    if (!renameValue.trim() || renameValue.trim() === folder.label) {
      cancelRename()
      return
    }
    try {
      setProcessingRename(true)
      const res = await fetch(`/api/match-folders/${folder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: renameValue.trim(),
          user_id: userId,
          role,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal rename')
      cancelRename()
      await fetchAll(true)
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setProcessingRename(false)
    }
  }

  // ===== CREATE FOLDER =====
  const submitCreateFolder = async () => {
    if (!newFolderName.trim()) return
    try {
      setCreatingFolder(true)
      const res = await fetch('/api/match-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          match_id: matchId,
          label: newFolderName.trim(),
          user_id: userId,
          role,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal buat folder')
      setShowCreateFolder(false)
      setNewFolderName('')
      await fetchAll(true)
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setCreatingFolder(false)
    }
  }

  // ===== DELETE FOLDER =====
  const submitDeleteFolder = async () => {
    if (!folderToDelete) return
    try {
      setDeletingFolder(true)
      const res = await fetch(
        `/api/match-folders/${folderToDelete.id}?user_id=${userId}&role=${role}`,
        { method: 'DELETE' }
      )
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Gagal hapus folder')
      setShowDeleteFolder(false)
      setFolderToDelete(null)
      if (activeFolder?.id === folderToDelete.id) {
        setActiveFolder(null)
      }
      await fetchAll(true)
    } catch (err: any) {
      alert('❌ ' + err.message)
    } finally {
      setDeletingFolder(false)
    }
  }

  // ===== VISIBLE FOLDERS =====
  const privateFolderKey =
    role === 'tutor' ? 'tutor_private' : 'student_private'
  const privateFolderLabel = 'Pribadi Saya'

  const privateFolder: FolderItem = {
    id: 'private',
    match_id: matchId,
    folder_key: privateFolderKey,
    label: privateFolderLabel,
    is_default: true,
    created_by: null,
    created_at: '',
  }

  const allFolders = [privateFolder, ...folders]

  const activeFiles = activeFolder
    ? files.filter((f) => f.folder === activeFolder.folder_key)
    : []

  const getCount = (folderKey: string) => counts[folderKey] || 0

  return (
    <>
      <Card data-reschedule-keep="true" className="relative z-10">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-indigo-500" />
            Fileku
          </CardTitle>

          {role === 'tutor' && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 h-7 text-xs"
              onClick={() => setShowCreateFolder(true)}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              Folder Baru
            </Button>
          )}
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
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3 min-w-min">
                {allFolders.map((folder) => {
                  const count = getCount(folder.folder_key)
                  const isPrivate =
                    folder.folder_key === 'tutor_private' ||
                    folder.folder_key === 'student_private'
                  const isRenaming = renamingFolder === folder.id

                  return (
                    <div
                      key={folder.id}
                      className="group relative shrink-0 w-[170px] rounded-lg border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/40 transition-colors"
                    >
                      {isRenaming ? (
                        <div className="w-full flex flex-col items-start gap-2 p-3 text-left">
                          <div className="flex items-center justify-between w-full">
                            <div className="w-8 h-8 rounded-md bg-indigo-500/15 flex items-center justify-center">
                              {isPrivate ? (
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
                            <input
                              autoFocus
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  submitRename(folder)
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  cancelRename()
                                }
                                e.stopPropagation()
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full text-sm font-medium bg-background border border-primary/40 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary"
                              maxLength={50}
                              placeholder="Nama folder..."
                            />
                            <p className="text-[10px] text-muted-foreground mt-1">
                              Enter untuk simpan · Esc untuk batal
                            </p>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setActiveFolder(folder)}
                          className="w-full flex flex-col items-start gap-2 p-3 text-left"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div className="w-8 h-8 rounded-md bg-indigo-500/15 flex items-center justify-center">
                              {isPrivate ? (
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
                              {isPrivate
                                ? 'Private'
                                : folder.is_default
                                ? 'Shared'
                                : 'Custom'}
                            </p>
                          </div>
                        </button>
                      )}

                      {role === 'tutor' && (
                        <div className="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isRenaming ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-green-400 hover:text-green-500 hover:bg-green-500/10"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  submitRename(folder)
                                }}
                                disabled={processingRename}
                                title="Simpan (Enter)"
                              >
                                <Check className="w-3 h-3" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  cancelRename()
                                }}
                                title="Batal (Esc)"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </>
                          ) : (
                            <>
                              {!isPrivate && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-blue-400 hover:text-blue-500 hover:bg-blue-500/10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    startRename(folder)
                                  }}
                                  title="Rename folder"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              )}
                              {!folder.is_default && !isPrivate && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setFolderToDelete(folder)
                                    setShowDeleteFolder(true)
                                  }}
                                  title="Hapus folder"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
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
              {activeFolder?.folder_key === 'tutor_private' ||
              activeFolder?.folder_key === 'student_private' ? (
                <Lock className="w-4 h-4 text-amber-400" />
              ) : (
                <Folder className="w-4 h-4 text-indigo-400" />
              )}
              {activeFolder?.label}
              <Badge variant="outline" className="text-xs ml-1">
                {activeFiles.length} file
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {activeFolder?.folder_key === 'tutor_private' ||
              activeFolder?.folder_key === 'student_private'
                ? 'Folder pribadi'
                : 'Folder tugas'}
            </DialogDescription>
          </DialogHeader>

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
                    {/* ===== HANYA MUNCUL KALAU FILE MILIK SENDIRI ===== */}
                    {file.uploaded_by_me && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-400 hover:text-red-500"
                        onClick={() => handleDeleteFile(file.id)}
                        disabled={deletingId === file.id}
                        title="Hapus"
                      >
                        {deletingId === file.id ? (
                          <Spinner className="w-3.5 h-3.5" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
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

      {/* ===== DIALOG BUAT FOLDER BARU ===== */}
      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-indigo-400" />
              Folder Baru
            </DialogTitle>
            <DialogDescription>
              Beri nama folder baru. Bisa di-rename atau dihapus nanti.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <input
              autoFocus
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCreateFolder()
              }}
              placeholder="Contoh: PR Aljabar, UTS, Latihan Soal..."
              maxLength={50}
              className="w-full p-2 text-sm rounded-md bg-background border border-input focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateFolder(false)
                setNewFolderName('')
              }}
              disabled={creatingFolder}
            >
              Batal
            </Button>
            <Button
              onClick={submitCreateFolder}
              disabled={creatingFolder || !newFolderName.trim()}
              className="gap-1.5"
            >
              {creatingFolder ? (
                <Spinner className="w-3.5 h-3.5" />
              ) : (
                <FolderPlus className="w-3.5 h-3.5" />
              )}
              Buat Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DIALOG KONFIRMASI HAPUS FOLDER ===== */}
      <Dialog open={showDeleteFolder} onOpenChange={setShowDeleteFolder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="w-4 h-4" />
              Hapus Folder?
            </DialogTitle>
            <DialogDescription>
              Folder <strong>{folderToDelete?.label}</strong> beserta semua
              file di dalamnya akan dihapus permanen. Tindakan ini tidak bisa
              dibatalkan.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteFolder(false)
                setFolderToDelete(null)
              }}
              disabled={deletingFolder}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={submitDeleteFolder}
              disabled={deletingFolder}
              className="gap-1.5"
            >
              {deletingFolder ? (
                <Spinner className="w-3.5 h-3.5" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
  
}