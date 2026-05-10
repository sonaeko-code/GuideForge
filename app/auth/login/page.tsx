import { Suspense } from 'react'
import { LoginForm } from '@/components/guideforge/auth/login-form'

export const metadata = {
  title: 'Sign In | GuideForge',
  description: 'Sign in to your GuideForge account',
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginForm />
    </Suspense>
  )
}
