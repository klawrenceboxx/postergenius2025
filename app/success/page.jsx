import { Suspense } from 'react'
import SuccessClient from './success-client'

export default function Page() {
  return (
    <Suspense>
      <SuccessClient />
    </Suspense>
  )
}
