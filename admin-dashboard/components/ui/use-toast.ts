// components/ui/use-toast.ts
import { useState, useEffect } from "react"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000000

type ToasterToast = any // Simplified

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_VALUE
  return count.toString()
}

const listeners: Array<(state: any) => void> = []

let memoryState = { toasts: [] as any[] }

function dispatch(action: any) {
  switch (action.type) {
    case "ADD_TOAST":
      memoryState = {
        ...memoryState,
        toasts: [action.toast, ...memoryState.toasts].slice(0, TOAST_LIMIT),
      }
      break
    case "UPDATE_TOAST":
      memoryState = {
        ...memoryState,
        toasts: memoryState.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }
      break
    case "DISMISS_TOAST":
      memoryState = {
        ...memoryState,
        toasts: memoryState.toasts.filter((t) => t.id !== action.toastId),
      }
      break
    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        memoryState = {
          ...memoryState,
          toasts: [],
        }
      } else {
        memoryState = {
          ...memoryState,
          toasts: memoryState.toasts.filter((t) => t.id !== action.toastId),
        }
      }
      break
  }

  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

function toast({ ...props }: any) {
  const id = genId()

  const update = (props: any) =>
    dispatch({
      type: "UPDATE_TOAST",
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: "DISMISS_TOAST", toastId: id })

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open: boolean) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = useState(memoryState)

  useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}

export { useToast, toast }
