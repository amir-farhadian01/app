import api from '../lib/api'

export const getOrders = () => api.get('/orders').then((r) => r.data)
export const getOrder = (id: string) => api.get(`/orders/${id}`).then((r) => r.data)
export const createOrder = (payload: unknown) => api.post('/orders', payload).then((r) => r.data)
