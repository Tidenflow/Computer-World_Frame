import { useState } from 'react'

export function useSearchState() {
  const [searchQuery, setSearchQuery] = useState('')

  return {
    searchQuery,
    setSearchQuery,
    clearSearch() {
      setSearchQuery('')
    },
  }
}
