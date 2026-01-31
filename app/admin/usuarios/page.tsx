import { getUsers } from '@/lib/actions'
import { UsersList } from '@/components/UsersList'

export default async function UsuariosPage() {
  const users = await getUsers()

  return <UsersList initialUsers={users} />
}

