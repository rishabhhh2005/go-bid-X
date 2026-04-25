import api from './api'

export const loginRequest = async (payload) => {
  const response = await api.post('/login', payload)
  return response.data
}

export const registerRequest = async (payload) => {
  const response = await api.post('/register', payload)
  return response.data
}

export const getCurrentUser = async () => {
  const response = await api.get('/me')
  return response.data
}

export const fetchRfqs = async () => {
  const response = await api.get('/rfq')
  return response.data
}

export const fetchRfq = async (id) => {
  const response = await api.get(`/rfq/${id}`)
  return response.data
}

export const createRfq = async (payload) => {
  const response = await api.post('/rfq', payload)
  return response.data
}

export const deleteRfq = async (id) => {
  return api.delete(`/rfq/${id}`)
}

export const fetchBids = async (rfqId) => {
  const response = await api.get(`/bids/${rfqId}`)
  return response.data
}

export const placeBid = async (payload) => {
  const response = await api.post('/bid', payload)
  return response.data
}

export const fetchActivityLogs = async (rfqId) => {
  const response = await api.get(`/rfq/${rfqId}/activity`)
  return response.data
}
