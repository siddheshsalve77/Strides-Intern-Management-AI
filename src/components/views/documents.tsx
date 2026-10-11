'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader, EmptyState, CompactRow, StatusDot, RowSkeleton } from '@/components/portal/ui-helpers'
import { fmtDate } from '@/lib/format'
import { FileText, Download, Search, FileCheck, FileSignature, GraduationCap, BookMarked, Award, File, ShieldCheck, Upload, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import type { DocumentT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

const categoryIcons: Record<string, any> = {
  OFFER: FileSignature, HR: ShieldCheck, POLICY: BookMarked, CERTIFICATE: Award, TRAINING: GraduationCap, PERFORMANCE: FileCheck,
}

const categoryTint: Record<string, string> = {
  OFFER: 'bg-violet-500/10 text-violet-600',
  HR: 'bg-rose-500/10 text-rose-600',
  POLICY: 'bg-amber-500/10 text-amber-600',
  CERTIFICATE: 'bg-emerald-500/10 text-emerald-600',
  TRAINING: 'bg-sky-500/10 text-sky-600',
  PERFORMANCE: 'bg-teal-500/10 text-teal-600',
}

export function DocumentsView() {
  const { currentEmployee } = useApp()
  const [docs, setDocs] = useState<DocumentT[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('ALL')
  const [open, setOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('HR')
  const [fileName, setFileName] = useState('')

  async function load() {
    if (!currentEmployee) return
    setLoading(true)
    try {
      const [d, p] = await Promise.all([
        authedFetch(`/api/documents?employeeId=${currentEmployee.id}`).then((r) => r.json()).catch(() => []),
        authedFetch('/api/documents?category=POLICY').then((r) => r.json()).catch(() => []),
      ])
      setDocs([...(Array.isArray(d) ? d : []), ...(Array.isArray(p) ? p : [])])
    } catch {
      setDocs([])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [currentEmployee])

  async function upload() {
    if (!title || !fileName) { toast.error('Title and file required'); return }
    setUploading(true)
    try {
      await authedFetch('/api/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, category, fileName, employeeId: currentEmployee?.id }),
      })
      toast.success('Document uploaded'); setOpen(false); setTitle(''); setFileName(''); load()
    } catch { toast.error('Upload failed') } finally { setUploading(false) }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setFileName(f.name)
  }

  const categories = ['ALL', ...Array.from(new Set(docs.map((d) => d.category)))]
  const filtered = docs.filter((d) =>
    (cat === 'ALL' || d.category === cat) &&
    (!search || d.title.toLowerCase().includes(search.toLowerCase()))
  )

  const canUpload = currentEmployee && ['HR', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'INTERN'].includes(currentEmployee.role)

  // Category counts for chip display
  const categoryCounts: Record<string, number> = { ALL: docs.length }
  docs.forEach((d) => { categoryCounts[d.category] = (categoryCounts[d.category] || 0) + 1 })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Your offer letters, certificates, policies and more"
        actions={canUpload && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button className="gap-2 shadow-sm"><Upload className="h-4 w-4" /> Upload</Button></DialogTrigger>
            <DialogContent className="max-w-lg shadow-pop">
              <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Document title…" /></div>
                <div className="space-y-1.5"><Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                    {['HR', 'OFFER', 'POLICY', 'CERTIFICATE', 'TRAINING', 'PERFORMANCE'].map((c) => <SelectItem key={c} value={c}>{c.charAt(0) + c.slice(1).toLowerCase()}</SelectItem>)}
                  </SelectContent></Select>
                </div>
                <div className="space-y-1.5">
                  <Label>File</Label>
                  <div className="rounded-lg border-2 border-dashed border-border p-4 text-center hover:border-primary/40 transition-colors">
                    <input type="file" onChange={onFileChange} className="hidden" id="file-upload" />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary grid place-items-center"><Upload className="h-5 w-5" /></div>
                      {fileName ? (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600"><CheckCircle2 className="h-4 w-4" /> {fileName}</div>
                      ) : (
                        <>
                          <p className="text-sm font-medium">Click to select a file</p>
                          <p className="text-xs text-muted-foreground">PDF, DOCX, JPG up to 10MB</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={upload} disabled={uploading || !fileName}>{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      {/* Summary strip + search */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-rise">
        <div className="sm:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents by title…" className="pl-9 h-10" />
        </div>
        <div className="flex items-center justify-start sm:justify-end">
          <Badge variant="outline" className="text-[11px] tabular-nums">
            {filtered.length} of {docs.length} document{docs.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Category filter chips */}
      <Tabs value={cat} onValueChange={setCat}>
        <TabsList className="flex-wrap h-auto bg-transparent gap-1.5 p-0">
          {categories.map((c) => {
            const isActive = cat === c
            const tint = c === 'ALL' ? 'bg-primary/10 text-primary' : (categoryTint[c] || 'bg-muted text-muted-foreground')
            return (
              <TabsTrigger
                key={c}
                value={c}
                className={`text-[11px] h-7 px-3 gap-1.5 data-[state=active]:shadow-sm ${isActive ? tint : 'text-muted-foreground'}`}
              >
                <span className="uppercase tracking-wide">{c === 'ALL' ? 'All' : c.charAt(0) + c.slice(1).toLowerCase()}</span>
                <span className="text-[10px] opacity-70 tabular-nums">{categoryCounts[c] || 0}</span>
              </TabsTrigger>
            )
          })}
        </TabsList>

        <TabsContent value={cat}>
          {loading ? (
            <Card className="p-3 shadow-card"><RowSkeleton count={6} /></Card>
          ) : filtered.length === 0 ? (
            <Card><EmptyState icon={FileText} title="No documents" description="Documents will appear here once uploaded." /></Card>
          ) : (
            <Card className="shadow-card overflow-hidden">
              {/* Table-like header row (hidden on mobile) */}
              <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-border/60 bg-muted/30 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                <div className="col-span-5">Name</div>
                <div className="col-span-2">Type</div>
                <div className="col-span-2">Uploaded</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1 text-right">Action</div>
              </div>
              <div className="p-2 max-h-[32rem] overflow-y-auto scrollbar-thin">
                {filtered.map((d) => {
                  const Icon = categoryIcons[d.category] || File
                  const tint = categoryTint[d.category] || 'bg-muted text-muted-foreground'
                  return (
                    <CompactRow
                      key={d.id}
                      leading={
                        <div className={`h-9 w-9 rounded-lg grid place-items-center shrink-0 ${tint}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                      }
                      title={
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[13px] font-medium truncate">{d.title}</span>
                          <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${tint}`}>
                            {d.category}
                          </span>
                        </div>
                      }
                      subtitle={
                        <span className="text-[11px] text-muted-foreground truncate">
                          {d.fileName || 'No file attached'}
                        </span>
                      }
                      trailing={
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="hidden md:flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground tabular-nums w-20">{fmtDate(d.uploadedAt, 'd MMM yyyy')}</span>
                            <StatusDot tone="success" />
                          </div>
                          <span className="text-[11px] text-muted-foreground tabular-nums md:hidden">{fmtDate(d.uploadedAt, 'd MMM')}</span>
                          <Button variant="outline" size="sm" className="h-7 px-2 text-[11px] gap-1.5">
                            <Download className="h-3 w-3" /> <span className="hidden sm:inline">Download</span>
                          </Button>
                        </div>
                      }
                      className="!py-2.5 animate-rise"
                    />
                  )
                })}
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
