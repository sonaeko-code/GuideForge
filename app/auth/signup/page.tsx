import { Suspense } from 'react'
import { SignupForm } from '@/components/guideforge/auth/signup-form'

export const metadata = {
  title: 'Sign Up | GuideForge',
  description: 'Create a new GuideForge account',
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupForm />
    </Suspense>
  )
}
