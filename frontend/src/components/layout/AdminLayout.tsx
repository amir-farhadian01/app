import { Outlet } from 'react-router-dom'

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Outlet />
    </div>
  )
}
