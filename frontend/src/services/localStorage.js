const RFQ_STORAGE_KEY = 'gobidx_rfqs'
const USER_STORAGE_KEY = 'gobidx_user'

export const getLocalRfqs = () => {
  try {
    const stored = localStorage.getItem(RFQ_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export const saveLocalRfq = (rfq) => {
  const currentList = getLocalRfqs()
  const updated = [rfq, ...currentList.filter((item) => item.id !== rfq.id)]
  localStorage.setItem(RFQ_STORAGE_KEY, JSON.stringify(updated))
  return updated
}

export const removeLocalRfq = (rfqId) => {
  const updated = getLocalRfqs().filter((item) => item.id !== rfqId)
  localStorage.setItem(RFQ_STORAGE_KEY, JSON.stringify(updated))
  return updated
}

export const getLocalUser = () => {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export const saveLocalUser = (user) => {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
}

export const removeLocalUser = () => {
  localStorage.removeItem(USER_STORAGE_KEY)
}
