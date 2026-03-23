export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PerfilPage() {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const name = profile?.name || user.user_metadata?.name || ''
  const lastName = profile?.last_name || user.user_metadata?.last_name || ''
  const email = user.email || ''
  const plan = profile?.plan || 'free'
  const createdAt = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '—'

  const planLabels: Record<string, string> = {
    free: 'Free',
    pro_mensual: 'Pro Mensual',
    pro_anual: 'Pro Anual',
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gesti-dark mb-6">Mi Perfil</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y">
        <ProfileRow label="Nombre" value={`${name} ${lastName}`.trim() || '—'} />
        <ProfileRow label="Correo" value={email} />
        <ProfileRow label="Plan" value={planLabels[plan] || plan} />
        <ProfileRow label="Miembro desde" value={createdAt} />
        <ProfileRow label="ID" value={user.id} mono />
      </div>
    </div>
  )
}

function ProfileRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <span className={`text-sm text-gesti-dark ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  )
}
