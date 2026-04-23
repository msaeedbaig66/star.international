import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
 return twMerge(clsx(inputs))
 }

export function formatDate(date: string | Date): string {
 const d = new Date(date)
 if (isNaN(d.getTime())) return '—'
 return new Intl.DateTimeFormat('en-US', {
 year: 'numeric', month: 'short', day: 'numeric'
 }).format(d)
}

export function formatRelativeTime(date: string | Date): string {
 const d = new Date(date)
 if (isNaN(d.getTime())) return '—'
 const now = new Date()
 const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
 if (diff < 60) return 'just now'
 if (diff < 3600) return `${Math.floor(diff/60)}m ago`
 if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
 if (diff < 604800) return `${Math.floor(diff/86400)}d ago`
 return formatDate(date)
}

export function formatTime(date: string | Date): string {
 const d = new Date(date)
 if (isNaN(d.getTime())) return '—'
 return new Intl.DateTimeFormat('en-US', {
 hour: 'numeric',
 minute: '2-digit',
 hour12: true
 }).format(d)
}

export function formatPrice(price: number): string {
 return new Intl.NumberFormat('en-PK', {
 style: 'currency', currency: 'PKR', maximumFractionDigits: 0
 }).format(price)
 }

export function truncate(str: string, length: number): string {
 return str.length > length ? str.slice(0, length) + '...' : str
 }

export function formatNumber(num: number): string {
 if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
 if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
 return num.toString()
}

export function generateSlug(title: string): string {
 return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export function escapeHtml(unsafe: string): string {
 return unsafe
 .replace(/&/g, "&amp;")
 .replace(/</g, "&lt;")
 .replace(/>/g, "&gt;")
 .replace(/"/g, "&quot;")
 .replace(/'/g, "&#039;");
}
