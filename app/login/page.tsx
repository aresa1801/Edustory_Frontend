import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'
import { Spinner } from '@/components/ui/spinner'

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="mb-8 text-center flex justify-center">
          <Spinner className="h-6 w-6" />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center py-12 px-4">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
