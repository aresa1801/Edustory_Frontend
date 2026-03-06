'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import StudentRegistrationForm from '@/components/auth/student-registration-form'
import TutorRegistrationForm from '@/components/auth/tutor-registration-form'

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Bergabunglah dengan EduStory
            </h1>
            <p className="text-muted-foreground">
              Daftar sebagai siswa atau pengajar untuk memulai perjalanan belajar Anda
            </p>
          </div>

          <Tabs defaultValue="student" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="student">Daftar sebagai Siswa</TabsTrigger>
              <TabsTrigger value="tutor">Daftar sebagai Pengajar</TabsTrigger>
            </TabsList>

            <TabsContent value="student" className="space-y-4">
              <StudentRegistrationForm />
            </TabsContent>

            <TabsContent value="tutor" className="space-y-4">
              <TutorRegistrationForm />
            </TabsContent>
          </Tabs>

          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Sudah memiliki akun?{' '}
              <a href="/login" className="text-primary font-semibold hover:underline">
                Masuk di sini
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
