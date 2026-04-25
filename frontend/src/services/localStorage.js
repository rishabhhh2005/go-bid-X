const RFQ_STORAGE_KEY = 'gobidx_rfqs'

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
