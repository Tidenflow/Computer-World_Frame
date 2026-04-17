import { useEffect, useState } from 'react'

export function useSearchState(delayMs = 300) {
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery)
    }, delayMs)

    return () => window.clearTimeout(timer)
  }, [delayMs, searchQuery])

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    clearSearch() {
      setSearchQuery('')
    },
  }
}
