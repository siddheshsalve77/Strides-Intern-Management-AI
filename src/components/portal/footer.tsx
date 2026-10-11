'use client'

import { useApp } from '@/lib/store'
import { Heart, Github, LifeBuoy, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function Footer() {
  const { currentEmployee, setView } = useApp()
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-border bg-background/60 backdrop-blur mt-8">
      <div className="px-4 lg:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary text-primary-foreground grid place-items-center text-[10px] font-bold">
            S
          </div>
          <span>© {year} Strides Software, Aurangabad.</span>
          <Badge variant="outline" className="text-[10px] hidden sm:inline-flex gap-1">
            <ShieldCheck className="h-3 w-3" /> v2.0
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setView('requests')} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
            <LifeBuoy className="h-3.5 w-3.5" /> Support
          </button>
          <button onClick={() => setView('documents')} className="hover:text-foreground transition-colors">
            Policies
          </button>
          <span className="flex items-center gap-1">
            Built with <Heart className="h-3 w-3 text-rose-500 fill-rose-500" /> by Strides Eng
          </span>
        </div>
      </div>
    </footer>
  )
}
