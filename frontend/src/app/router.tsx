import { createBrowserRouter, Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import type { ReactNode } from 'react'

import { PublicLayout } from '../components/layout/PublicLayout'
import { CustomerLayout } from '../components/layout/CustomerLayout'
import { BusinessLayout } from '../components/layout/BusinessLayout'
import { AdminLayout } from '../components/layout/AdminLayout'

import Feed from '../pages/public/Feed'
import Explore from '../pages/public/Explore'
import ServiceDetail from '../pages/public/ServiceDetail'
import Login from '../pages/auth/Login'
import Register from '../pages/auth/Register'

import CustomerHome from '../pages/customer/CustomerHome'
import MyOrders from '../pages/customer/MyOrders'
import OrderDetail from '../pages/customer/OrderDetail'
import Messages from '../pages/customer/Messages'

import BusinessDashboard from '../pages/business/BusinessDashboard'
import Inbox from '../pages/business/Inbox'
import Schedule from '../pages/business/Schedule'
import Clients from '../pages/business/Clients'
import Finance from '../pages/business/Finance'
import Social from '../pages/business/Social'

import AdminDashboard from '../pages/admin/AdminDashboard'

function RequireAuth({ children, roles }: { children: ReactNode; roles?: string[] }) {
  const { token, user } = useAuthStore()
  if (!token) return <Navigate to="/auth/login" replace />
  if (roles && user && !roles.some((r) => user.roles.includes(r))) {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: '/', element: <Feed /> },
      { path: '/explore', element: <Explore /> },
      { path: '/services/:id', element: <ServiceDetail /> },
      { path: '/auth/login', element: <Login /> },
      { path: '/auth/register', element: <Register /> },
    ],
  },
  {
    element: <RequireAuth roles={['CUSTOMER']}><CustomerLayout /></RequireAuth>,
    children: [
      { path: '/app/home', element: <CustomerHome /> },
      { path: '/app/orders', element: <MyOrders /> },
      { path: '/app/orders/:id', element: <OrderDetail /> },
      { path: '/app/messages', element: <Messages /> },
    ],
  },
  {
    path: '/business/:workspaceId',
    element: <RequireAuth roles={['BUSINESS_OWNER', 'EMPLOYEE']}><BusinessLayout /></RequireAuth>,
    children: [
      { index: true, element: <BusinessDashboard /> },
      { path: 'inbox', element: <Inbox /> },
      { path: 'schedule', element: <Schedule /> },
      { path: 'clients', element: <Clients /> },
      { path: 'finance', element: <Finance /> },
      { path: 'social', element: <Social /> },
    ],
  },
  {
    path: '/admin',
    element: <RequireAuth roles={['ADMIN']}><AdminLayout /></RequireAuth>,
    children: [
      { index: true, element: <AdminDashboard /> },
    ],
  },
])
