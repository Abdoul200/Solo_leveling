'use client'

import { motion } from 'framer-motion'

interface AuraEffectProps {
  type: 'fire' | 'ice' | 'thunder' | 'shadow' | 'holy'
  size?: 'sm' | 'md' | 'lg'
}

const SIZE_MAP = {
  sm: { container: 'w-12 h-12', particle: 4, ringScale: 1.6 },
  md: { container: 'w-20 h-20', particle: 6, ringScale: 1.5 },
  lg: { container: 'w-28 h-28', particle: 8, ringScale: 1.4 },
}

const AURA_CONFIGS = {
  fire: {
    primary: '#ef4444',
    secondary: '#f97316',
    glow: 'rgba(239, 68, 68, 0.6)',
    particles: ['🔥', '✦', '✦'],
  },
  ice: {
    primary: '#60a5fa',
    secondary: '#93c5fd',
    glow: 'rgba(96, 165, 250, 0.5)',
    particles: ['❄', '✦', '✦'],
  },
  thunder: {
    primary: '#facc15',
    secondary: '#fde047',
    glow: 'rgba(250, 204, 21, 0.6)',
    particles: ['⚡', '✦', '✦'],
  },
  shadow: {
    primary: '#8b5cf6',
    secondary: '#a78bfa',
    glow: 'rgba(139, 92, 246, 0.6)',
    particles: ['✦', '✦', '✦'],
  },
  holy: {
    primary: '#fde68a',
    secondary: '#fbbf24',
    glow: 'rgba(253, 224, 71, 0.6)',
    particles: ['✨', '✦', '✦'],
  },
}

export default function AuraEffect({ type, size = 'md' }: AuraEffectProps) {
  const config = AURA_CONFIGS[type]
  const dimensions = SIZE_MAP[size]

  return (
    <div className={`relative flex items-center justify-center ${dimensions.container}`}>
      {/* Anneau pulsant principal */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          border: `2px solid ${config.primary}`,
          boxShadow: `0 0 15px ${config.glow}, inset 0 0 10px ${config.glow}30`,
        }}
        animate={{
          scale: [1, dimensions.ringScale, 1],
          opacity: [0.8, 0, 0.8],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeOut',
        }}
      />

      {/* Anneau secondaire décalé */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          border: `1px solid ${config.secondary}80`,
        }}
        animate={{
          scale: [1, dimensions.ringScale * 0.8, 1],
          opacity: [0.6, 0, 0.6],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
          delay: 0.5,
        }}
      />

      {/* Fond lumineux */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: `radial-gradient(circle, ${config.glow}40 0%, transparent 70%)`,
        }}
        animate={{
          opacity: [0.6, 1, 0.6],
          scale: [0.9, 1.1, 0.9],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Particules spécifiques à l'aura */}
      {type === 'fire' && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute text-xs"
              style={{ color: config.primary }}
              animate={{
                y: [0, -20, -40],
                x: [0, (i - 1) * 8, (i - 1) * 12],
                opacity: [1, 0.5, 0],
                scale: [1, 0.7, 0.3],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                delay: i * 0.5,
                ease: 'easeOut',
              }}
            >
              🔥
            </motion.div>
          ))}
        </>
      )}

      {type === 'ice' && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute w-1 h-1 rounded-full"
              style={{
                background: config.primary,
                top: `${25 + Math.sin((i / 4) * Math.PI * 2) * 30}%`,
                left: `${50 + Math.cos((i / 4) * Math.PI * 2) * 40}%`,
              }}
              animate={{
                rotate: [0, 360],
                scale: [1, 1.5, 1],
                opacity: [0.8, 0.3, 0.8],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'linear',
              }}
            />
          ))}
        </>
      )}

      {type === 'thunder' && (
        <>
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              className="absolute text-xs font-bold"
              style={{
                color: config.primary,
                top: `${20 + i * 40}%`,
                left: `${10 + i * 60}%`,
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1.2, 0.5],
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.4,
                ease: 'easeInOut',
              }}
            >
              ⚡
            </motion.div>
          ))}
        </>
      )}

      {type === 'shadow' && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, ${config.primary}30, transparent, ${config.secondary}20, transparent)`,
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        />
      )}

      {type === 'holy' && (
        <>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${60 + i * 15}%`,
                height: `${60 + i * 15}%`,
                border: `1px solid ${config.primary}40`,
              }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.4, 0.8, 0.4],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.3,
                ease: 'easeInOut',
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}
