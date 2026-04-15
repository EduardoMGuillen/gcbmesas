import { getUsers, getEventsForTicketeraAssignment } from '@/lib/actions'
import { UsersList } from '@/components/UsersList'

export default async function UsuariosPage() {
  const [users, ticketeraEvents] = await Promise.all([getUsers(), getEventsForTicketeraAssignment()])

  return <UsersList initialUsers={users} ticketeraEvents={ticketeraEvents} />
}

