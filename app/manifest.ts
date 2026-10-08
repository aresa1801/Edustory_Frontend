import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'EduStory — Platform Pembelajaran Privat',
    short_name: 'EduStory',
    description:
      'Cari pengajar profesional, atur jadwal, dan pantau progres belajar — semua dalam satu aplikasi.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FBFBFE',
    theme_color: '#5B4BF5',
    lang: 'id',
    dir: 'ltr',
    categories: ['education', 'productivity'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Cari Pengajar', url: '/dashboard/student/find-tutors' },
      { name: 'Jadwal Belajar', url: '/dashboard/student/schedule' },
      { name: 'Portal Pengajar', url: '/dashboard/tutor' },
    ],
  }
}
