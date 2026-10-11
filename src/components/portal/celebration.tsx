'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6']

// Generate confetti pieces deterministically based on a seed
function generatePieces(seed: number, count = 40) {
  // Simple seeded random
  let s = seed
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: rand() * 100,
    rotation: rand() * 360,
    color: COLORS[Math.floor(rand() * COLORS.length)],
    delay: rand() * 0.3,
    duration: 1.5 + rand() * 1,
    size: 6 + rand() * 8,
  }))
}

export function CelebrationOverlay({ trigger, message }: { trigger: number; message?: string }) {
  const [show, setShow] = useState(false)
  // useMemo generates pieces based on trigger without setState-in-effect
  const pieces = useMemo(() => trigger > 0 ? generatePieces(trigger + Date.now()) : [], [trigger])

  useEffect(() => {
    if (trigger === 0) return
    setShow(true)
    const timer = setTimeout(() => setShow(false), 3000)
    return () => clearTimeout(timer)
  }, [trigger])

  return (
    <AnimatePresence>
      {show && pieces.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 pointer-events-none z-[100] overflow-hidden"
        >
          {pieces.map((p) => (
            <motion.div
              key={`${trigger}-${p.id}`}
              initial={{
                x: `${p.x}vw`,
                y: '-10vh',
                rotate: p.rotation,
                opacity: 1,
              }}
              animate={{
                y: '110vh',
                rotate: p.rotation + 720,
                opacity: [1, 1, 0.8, 0],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: 'easeIn',
              }}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size * 0.6,
                backgroundColor: p.color,
                borderRadius: 2,
              }}
            />
          ))}
          {message && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 12, delay: 0.2 }}
              className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
            >
              <div className="text-5xl mb-2">🎉</div>
              <p className="text-xl font-bold text-primary bg-background/90 backdrop-blur px-6 py-3 rounded-xl shadow-lg">
                {message}
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
