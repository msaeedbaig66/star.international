import { getAuthorizedAdminClient } from '@/lib/supabase/admin'
import { SourcingRequestsManager } from '@/components/admin/sourcing-requests-manager'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function AdminSourcingPage() {
  let supabase
  try {
    supabase = await getAuthorizedAdminClient()
  } catch (err) {
    return (
      <div className="p-10 text-center">
        <h2 className="text-2xl font-black text-text-primary uppercase mb-4">Access Denied</h2>
        <Link href="/" className="text-primary hover:underline">Back to Home</Link>
      </div>
    )
  }

  // Fetch requests with user details
  const { data: requests, error } = await supabase
    .from('sourcing_requests')
    .select(`
      *,
      user:profiles(full_name, email, phone_number, phone, username)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching sourcing requests:', error)
  }

  return (
    <div className="max-w-7xl mx-auto">
      <SourcingRequestsManager initialRequests={requests || []} />
    </div>
  )
}
