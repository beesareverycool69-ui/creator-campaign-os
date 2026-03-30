import { redirect } from 'next/navigation'

// Redirect root to login page
export default function Home() {
  redirect('/login')
}
