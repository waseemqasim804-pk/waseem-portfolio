import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const activeLists = new WeakMap<object, Map<string, Set<symbol>>>()

export function useListRenderWarning(list: unknown, label: string, enabled = true) {
  const { pathname } = useLocation()

  useEffect(() => {
    if (!import.meta.env.DEV || !enabled || !Array.isArray(list) || list.length === 0) return

    const key = list as object
    const routeLists = activeLists.get(key) ?? new Map<string, Set<symbol>>()
    const instances = routeLists.get(pathname) ?? new Set<symbol>()
    if (instances.size > 0) {
      console.warn(`[content] The ${label} list is being rendered more than once on ${pathname}.`)
    }

    const instance = Symbol(label)
    instances.add(instance)
    routeLists.set(pathname, instances)
    activeLists.set(key, routeLists)

    return () => {
      instances.delete(instance)
      if (instances.size === 0) routeLists.delete(pathname)
      if (routeLists.size === 0) activeLists.delete(key)
    }
  }, [enabled, label, list, pathname])
}
