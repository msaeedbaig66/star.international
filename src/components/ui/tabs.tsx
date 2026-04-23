'use client'
import { cn } from '@/lib/utils'
import { createContext, useContext, useState } from 'react'

const Ctx = createContext<{active:string;set:(v:string)=>void}>({active:'',set:()=>{}})

export function Tabs({ defaultValue, children, className }: { defaultValue:string; children:React.ReactNode; className?:string }) {
 const [active,set] = useState(defaultValue)
 return <Ctx.Provider value={{active,set}}><div className={className}>{children}</div></Ctx.Provider>
 }

export function TabsList({ children, className }: { children:React.ReactNode; className?:string }) {
 return <div className={cn('flex items-center gap-1 border-b border-border overflow-x-auto', className)}>{children}</div>
 }

export function TabsTrigger({ value, children, className }: { value:string; children:React.ReactNode; className?:string }) {
 const {active,set} = useContext(Ctx)
 return (
 <button onClick={()=>set(value)} className={cn('px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px', active===value ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-strong', className)}>
 {children}
 </button>
 )
 }

export function TabsContent({ value, children, className }: { value:string; children:React.ReactNode; className?:string }) {
 const {active} = useContext(Ctx)
 if (active !== value) return null
 return <div className={cn('pt-4', className)}>{children}</div>
}
