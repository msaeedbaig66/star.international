'use client';

import { ReactNode, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DetailPanelProps {
 isOpen: boolean;
 onClose: () => void;
 title: string;
 children: ReactNode;
 footer?: ReactNode;
 width?: string;
}

export function DetailPanel({ isOpen, onClose, title, children, footer, width = 'w-[450px]' }: DetailPanelProps) {
 // Prevent body scroll when panel is open
 useEffect(() => {
 if (isOpen) {
 document.body.style.overflow = 'hidden';
 } else {
 document.body.style.overflow = 'auto';
 }
 }, [isOpen]);

 return (
 <>
 {/* Backdrop */}
 <div 
 className={cn(
 "fixed inset-0 bg-text-primary/10 backdrop-blur-sm z-50 transition-opacity duration-300",
 isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
 )}
 onClick={onClose}
 />

 {/* Panel */}
 <div 
 className={cn(
 "fixed inset-y-0 right-0 bg-white z-[60] shadow-2xl flex flex-col transition-transform duration-300 transform border-l border-border",
 width,
 isOpen ? "translate-x-0" : "translate-x-full"
 )}
 >
 <div className="p-6 border-b border-border flex items-center justify-between">
 <h3 className="text-xl font-bold text-text-primary">{title}</h3>
 <button onClick={onClose} className="p-2 hover:bg-surface rounded-full transition-colors group">
 <span className="material-symbols-outlined text-text-muted group-hover:text-text-primary transition-colors">close</span>
 </button>
 </div>

 <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
 {children}
 </div>

 {footer && (
 <div className="p-6 border-t border-border bg-surface flex flex-col gap-3">
 {footer}
 </div>
 )}
 </div>
 </>
 );
}
