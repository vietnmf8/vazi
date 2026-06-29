import { useState, useEffect } from "react"

export function useDebouncedLoading(isLoading?: boolean, delay = 200) {
 const [showLoading, setShowLoading] = useState(false)

 useEffect(() => {
 if (isLoading) {
 const timer = setTimeout(() => setShowLoading(true), delay)
 return () => clearTimeout(timer)
 } else {
 setShowLoading(false)
 }
 }, [isLoading, delay])

 return showLoading
}
