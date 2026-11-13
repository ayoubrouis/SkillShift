"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Bell, CheckCircle, ArrowLeft, Trash2 } from "lucide-react"

interface Notification {
  id: string; title: string; message: string; is_read: boolean; created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifs, setNotifs] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push("/login"); return }
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (data) setNotifs(data)
      setLoading(false)

      // Mark all as read
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).is('is_read', false)
    }
    load()
  }, [router])

  const deleteNotif = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id)
    setNotifs(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => router.back()} className="text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Bell className="h-6 w-6 text-blue-400" />
          <h1 className="text-xl font-bold text-white">Notifications</h1>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">{notifs.length}</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : notifs.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">No notifications yet</p>
            <p className="text-slate-500 text-sm mt-1">Recruiters will notify you here when they match you with a job.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifs.map(n => (
              <div key={n.id} className={`bg-slate-900 border ${n.is_read ? 'border-slate-800' : 'border-blue-500/30'} rounded-xl p-4`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm">{n.title}</p>
                    <p className="text-slate-400 text-xs mt-1">{n.message}</p>
                    <p className="text-slate-600 text-xs mt-2">{new Date(n.created_at).toLocaleString()}</p>
                  </div>
                  <button onClick={() => deleteNotif(n.id)} className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0 ml-2">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
