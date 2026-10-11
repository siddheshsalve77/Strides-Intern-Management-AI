'use client'

import { useState, useEffect } from 'react'
import { useApp } from '@/lib/store'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Save, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { EmployeeT } from '@/lib/types'
import { authedFetch } from '@/lib/firebase-auth'

interface FieldErrors {
  phone?: string
  emergencyPhone?: string
  skills?: string
  careerGoals?: string
}

const PHONE_REGEX = /^[\+]?[0-9\s\-\(\)]{8,16}$/

export function ProfileEditModal({ open, onOpenChange, onUpdated }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  onUpdated?: (emp: EmployeeT) => void
}) {
  const { currentEmployee, setEmployee } = useApp()
  const [form, setForm] = useState({
    phone: '', skills: '', emergencyContact: '', emergencyPhone: '', careerGoals: '',
  })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (open && currentEmployee) {
      setForm({
        phone: currentEmployee.phone || '',
        skills: currentEmployee.skills || '',
        emergencyContact: currentEmployee.emergencyContact || '',
        emergencyPhone: currentEmployee.emergencyPhone || '',
        careerGoals: currentEmployee.careerGoals || '',
      })
      setErrors({})
      setTouched({})
    }
  }, [open, currentEmployee])

  function validateField(field: string, value: string): string | undefined {
    switch (field) {
      case 'phone':
        if (!value.trim()) return 'Phone is required'
        if (!PHONE_REGEX.test(value)) return 'Enter a valid phone (8-16 digits, +, -, spaces)'
        return undefined
      case 'emergencyPhone':
        if (!value.trim()) return 'Emergency phone is required'
        if (!PHONE_REGEX.test(value)) return 'Enter a valid phone number'
        return undefined
      case 'skills':
        if (value.length > 500) return 'Skills must be under 500 characters'
        return undefined
      case 'careerGoals':
        if (value.length > 1000) return 'Career goals must be under 1000 characters'
        return undefined
      default:
        return undefined
    }
  }

  function handleChange(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setTouched((t) => ({ ...t, [field]: true }))
    const error = validateField(field, value)
    setErrors((e) => ({ ...e, [field]: error }))
  }

  function validateAll(): boolean {
    const newErrors: FieldErrors = {}
    newErrors.phone = validateField('phone', form.phone)
    newErrors.emergencyPhone = validateField('emergencyPhone', form.emergencyPhone)
    newErrors.skills = validateField('skills', form.skills)
    newErrors.careerGoals = validateField('careerGoals', form.careerGoals)
    setErrors(newErrors)
    setTouched({ phone: true, emergencyPhone: true, skills: true, careerGoals: true })
    return !Object.values(newErrors).some((v) => v)
  }

  async function save() {
    if (!currentEmployee) return
    if (!validateAll()) {
      toast.error('Please fix the validation errors')
      return
    }
    setSaving(true)
    try {
      const res = await authedFetch(`/api/employees/${currentEmployee.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Update failed')
      }
      const updated = await res.json() as EmployeeT
      setEmployee(updated)
      onUpdated?.(updated)
      onOpenChange(false)
      toast.success('Profile updated successfully', {
        description: 'Your contact details have been saved.',
      })
    } catch (e: any) {
      toast.error('Failed to update profile', {
        description: e.message || 'Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  function FieldError({ error }: { error?: string }) {
    if (!error) return null
    return (
      <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
        <AlertCircle className="h-3 w-3" /> {error}
      </p>
    )
  }

  function FieldValid({ field }: { field: string }) {
    if (!touched[field] || errors[field as keyof FieldErrors]) return null
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 absolute right-3 top-9" />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Editable fields</p>
            You can update your contact details, skills, and career goals. Sensitive fields (name, email, role, department, manager) are managed by HR.
          </div>

          {/* Phone */}
          <div className="space-y-1.5 relative">
            <Label htmlFor="phone">Phone <span className="text-rose-500">*</span></Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
              placeholder="+91 98765 43210"
              className={touched.phone && errors.phone ? 'border-rose-500 focus-visible:ring-rose-500/30' : touched.phone ? 'border-emerald-500/50' : ''}
            />
            <FieldValid field="phone" />
            <FieldError error={touched.phone ? errors.phone : undefined} />
          </div>

          {/* Emergency Contact */}
          <div className="space-y-1.5">
            <Label htmlFor="emergencyContact">Emergency Contact Name</Label>
            <Input
              id="emergencyContact"
              value={form.emergencyContact}
              onChange={(e) => handleChange('emergencyContact', e.target.value)}
              placeholder="Emergency contact person"
            />
          </div>

          {/* Emergency Phone */}
          <div className="space-y-1.5 relative">
            <Label htmlFor="emergencyPhone">Emergency Phone <span className="text-rose-500">*</span></Label>
            <Input
              id="emergencyPhone"
              value={form.emergencyPhone}
              onChange={(e) => handleChange('emergencyPhone', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, emergencyPhone: true }))}
              placeholder="+91 98765 43210"
              className={touched.emergencyPhone && errors.emergencyPhone ? 'border-rose-500 focus-visible:ring-rose-500/30' : touched.emergencyPhone ? 'border-emerald-500/50' : ''}
            />
            <FieldValid field="emergencyPhone" />
            <FieldError error={touched.emergencyPhone ? errors.emergencyPhone : undefined} />
          </div>

          {/* Skills */}
          <div className="space-y-1.5 relative">
            <Label htmlFor="skills">Skills</Label>
            <Textarea
              id="skills"
              value={form.skills}
              onChange={(e) => handleChange('skills', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, skills: true }))}
              placeholder="Comma-separated, e.g. TypeScript, React, Node.js"
              rows={2}
              className={touched.skills && errors.skills ? 'border-rose-500 focus-visible:ring-rose-500/30' : ''}
            />
            <div className="flex items-center justify-between">
              <FieldError error={touched.skills ? errors.skills : undefined} />
              <span className="text-[10px] text-muted-foreground">{form.skills.length}/500</span>
            </div>
          </div>

          {/* Career Goals */}
          <div className="space-y-1.5 relative">
            <Label htmlFor="careerGoals">Career Goals</Label>
            <Textarea
              id="careerGoals"
              value={form.careerGoals}
              onChange={(e) => handleChange('careerGoals', e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, careerGoals: true }))}
              placeholder="Your career aspirations and growth areas"
              rows={3}
              className={touched.careerGoals && errors.careerGoals ? 'border-rose-500 focus-visible:ring-rose-500/30' : ''}
            />
            <div className="flex items-center justify-between">
              <FieldError error={touched.careerGoals ? errors.careerGoals : undefined} />
              <span className="text-[10px] text-muted-foreground">{form.careerGoals.length}/1000</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
