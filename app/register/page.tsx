'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import StudentRegistrationForm from '@/components/auth/student-registration-form'
import TutorRegistrationForm from '@/components/auth/tutor-registration-form'
import AuthShell from '@/components/auth/auth-shell'

export default function RegisterPage() {
  return (
    <AuthShell wide>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight">Bergabung dengan EduStory</h1>
        <p className="mt-2 text-muted-foreground">
          Daftar sebagai siswa atau pengajar untuk memulai perjalanan belajarmu.
        </p>
      </div>

      <Tabs defaultValue="student" className="w-full">
        <TabsList className="mb-8 grid w-full grid-cols-2 rounded-xl">
          <TabsTrigger value="student" className="rounded-lg">
            Daftar sebagai Siswa
          </TabsTrigger>
          <TabsTrigger value="tutor" className="rounded-lg">
            Daftar sebagai Pengajar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="student" className="space-y-4">
          <StudentRegistrationForm />
        </TabsContent>

        <TabsContent value="tutor" className="space-y-4">
          <TutorRegistrationForm />
        </TabsContent>
      </Tabs>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Sudah memiliki akun?{' '}
        <a href="/auth/login" className="font-semibold text-primary hover:underline">
          Masuk di sini
        </a>
      </p>
    </AuthShell>
  )
}
