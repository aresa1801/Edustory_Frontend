'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AuthModal } from './auth-modal'

interface AuthModalDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  defaultMode?: 'signin' | 'signup'
}

export function AuthModalDialog({
  isOpen,
  onOpenChange,
  defaultMode = 'signin',
}: AuthModalDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {defaultMode === 'signin' ? 'Masuk ke EduStory' : 'Daftar di EduStory'}
          </DialogTitle>
        </DialogHeader>
        <AuthModal 
          initialMode={defaultMode}
          onSuccess={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
