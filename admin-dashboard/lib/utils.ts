import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: number | Date): string {
  const d = typeof date === 'number' ? new Date(date) : date
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatNumber(num: number | undefined | null): string {
  // 处理 undefined 或 null
  if (num === undefined || num === null || isNaN(num)) {
    return '0'
  }

  // 确保是有效数字
  const n = Number(num)
  if (isNaN(n)) {
    return '0'
  }

  if (n >= 1000000) {
    return (n / 1000000).toFixed(1) + 'M'
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(1) + 'K'
  }
  return n.toString()
}
