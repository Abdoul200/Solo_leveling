'use client'

import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
  life: number
  maxLife: number
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>(0)

  const COLORS = ['#00d4ff', '#8b5cf6', '#6d28d9', '#00a8cc', '#7c3aed']

  function createParticle(canvas: HTMLCanvasElement): Particle {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -Math.random() * 0.6 - 0.1,
      size: Math.random() * 2.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      life: 0,
      maxLife: Math.random() * 200 + 100,
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Redimensionner le canvas
    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // Initialiser les particules
    const PARTICLE_COUNT = 80
    particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () => createParticle(canvas))

    // Boucle d'animation
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach((particle, index) => {
        particle.x += particle.vx
        particle.y += particle.vy
        particle.life++

        // Osciller l'opacité
        const lifeRatio = particle.life / particle.maxLife
        const fadeIn = lifeRatio < 0.2 ? lifeRatio / 0.2 : 1
        const fadeOut = lifeRatio > 0.8 ? (1 - lifeRatio) / 0.2 : 1
        const currentOpacity = particle.opacity * fadeIn * fadeOut

        // Dessiner la particule
        ctx.save()
        ctx.globalAlpha = currentOpacity

        // Effet de halo
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 3
        )
        gradient.addColorStop(0, particle.color)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2)
        ctx.fill()

        // Point central
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()

        ctx.restore()

        // Réinitialiser la particule si elle sort de l'écran ou meurt
        if (
          particle.life >= particle.maxLife ||
          particle.x < -10 ||
          particle.x > canvas.width + 10 ||
          particle.y < -10
        ) {
          particlesRef.current[index] = createParticle(canvas)
          // Réinitialiser en bas de l'écran
          particlesRef.current[index].y = canvas.height + 10
        }
      })

      // Tracer des lignes entre les particules proches
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const dx = particlesRef.current[i].x - particlesRef.current[j].x
          const dy = particlesRef.current[i].y - particlesRef.current[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < 100) {
            ctx.save()
            ctx.globalAlpha = (1 - distance / 100) * 0.08
            ctx.strokeStyle = '#8b5cf6'
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(particlesRef.current[i].x, particlesRef.current[i].y)
            ctx.lineTo(particlesRef.current[j].x, particlesRef.current[j].y)
            ctx.stroke()
            ctx.restore()
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  )
}
