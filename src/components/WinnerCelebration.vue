<template>
  <div class="pointer-events-none fixed inset-0 z-[110] overflow-hidden">
    <template v-if="variant === 'confetti'">
      <span v-for="piece in confettiPieces" :key="piece.id" class="confetti" :style="piece.style" />
    </template>

    <template v-else-if="variant === 'fireworks'">
      <span
        v-for="particle in fireworkParticles"
        :key="particle.id"
        class="firework"
        :style="particle.style"
      />
    </template>

    <template v-else-if="variant === 'emoji-rain'">
      <span v-for="drop in emojiDrops" :key="drop.id" class="emoji-drop" :style="drop.style">
        {{ drop.emoji }}
      </span>
    </template>

    <template v-else-if="variant === 'balloons'">
      <span v-for="balloon in balloons" :key="balloon.id" class="balloon" :style="balloon.style" />
    </template>

    <template v-else-if="variant === 'sparkles'">
      <span v-for="star in sparkles" :key="star.id" class="sparkle" :style="star.style">✦</span>
    </template>

    <template v-else-if="variant === 'bouncing-balls'">
      <span v-for="ball in bouncingBalls" :key="ball.id" class="ball" :style="ball.style" />
    </template>

    <template v-else-if="variant === 'streamers'">
      <span
        v-for="streamer in streamers"
        :key="streamer.id"
        class="streamer"
        :style="streamer.style"
      />
    </template>

    <template v-else-if="variant === 'bubbles'">
      <span v-for="bubble in bubbles" :key="bubble.id" class="bubble" :style="bubble.style" />
    </template>

    <template v-else-if="variant === 'shockwave'">
      <span v-for="ring in shockwaves" :key="ring.id" class="shockwave" :style="ring.style" />
    </template>

    <template v-else-if="variant === 'laser-show'">
      <span v-for="beam in lasers" :key="beam.id" class="laser" :style="beam.style" />
    </template>
  </div>
</template>

<script lang="ts">
export type CelebrationVariant =
  | 'confetti'
  | 'fireworks'
  | 'emoji-rain'
  | 'balloons'
  | 'sparkles'
  | 'bouncing-balls'
  | 'streamers'
  | 'bubbles'
  | 'shockwave'
  | 'laser-show'
</script>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ variant: CelebrationVariant }>()

const PALETTE = [
  '#3e65ff',
  '#7d4dff',
  '#ff7f50',
  '#ffb347',
  '#00a896',
  '#2ec4b6',
  '#e71d36',
  '#ffd166',
]

const EMOJIS = ['🎉', '🥳', '🏆', '🔥', '⭐', '🎊', '💪']

function random(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

const confettiPieces = computed(() => {
  if (props.variant !== 'confetti') return []
  return Array.from({ length: 90 }, (_, id) => ({
    id,
    style: {
      left: `${random(0, 100)}%`,
      width: `${random(6, 11)}px`,
      height: `${random(10, 18)}px`,
      backgroundColor: pick(PALETTE),
      animationDuration: `${random(2.6, 4.4)}s`,
      animationDelay: `${random(-4.4, 0)}s`,
      '--sway': `${random(-18, 18)}vw`,
      '--spin': `${random(420, 1080)}deg`,
    } as Record<string, string>,
  }))
})

const fireworkParticles = computed(() => {
  if (props.variant !== 'fireworks') return []
  const particles: { id: number; style: Record<string, string> }[] = []
  let id = 0
  for (let burst = 0; burst < 6; burst++) {
    const centerX = random(15, 85)
    const centerY = random(15, 55)
    const delay = burst * 0.45 + random(0, 0.2)
    const duration = random(1.1, 1.5)
    const color = pick(PALETTE)
    const count = 24
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + random(-0.1, 0.1)
      const distance = random(70, 160)
      particles.push({
        id: id++,
        style: {
          left: `${centerX}%`,
          top: `${centerY}%`,
          backgroundColor: color,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          '--dx': `${Math.cos(angle) * distance}px`,
          '--dy': `${Math.sin(angle) * distance}px`,
        },
      })
    }
  }
  return particles
})

const emojiDrops = computed(() => {
  if (props.variant !== 'emoji-rain') return []
  return Array.from({ length: 36 }, (_, id) => ({
    id,
    emoji: pick(EMOJIS),
    style: {
      left: `${random(0, 100)}%`,
      fontSize: `${random(1.4, 2.8)}rem`,
      animationDuration: `${random(2.8, 5)}s`,
      animationDelay: `${random(-5, 0)}s`,
      '--sway': `${random(-10, 10)}vw`,
      '--spin': `${random(-360, 360)}deg`,
    } as Record<string, string>,
  }))
})

const balloons = computed(() => {
  if (props.variant !== 'balloons') return []
  return Array.from({ length: 14 }, (_, id) => ({
    id,
    style: {
      left: `${random(2, 94)}%`,
      width: `${random(2.6, 4)}rem`,
      animationDuration: `${random(4.5, 7)}s`,
      animationDelay: `${random(-5, 0)}s`,
      '--sway': `${random(-8, 8)}vw`,
      '--balloon-color': pick(PALETTE),
    } as Record<string, string>,
  }))
})

const sparkles = computed(() => {
  if (props.variant !== 'sparkles') return []
  return Array.from({ length: 44 }, (_, id) => ({
    id,
    style: {
      left: `${random(2, 96)}%`,
      top: `${random(4, 92)}%`,
      fontSize: `${random(0.9, 2.6)}rem`,
      color: pick(PALETTE),
      animationDuration: `${random(0.9, 1.8)}s`,
      animationDelay: `${random(-2, 0)}s`,
    } as Record<string, string>,
  }))
})

const bouncingBalls = computed(() => {
  if (props.variant !== 'bouncing-balls') return []
  return Array.from({ length: 12 }, (_, id) => ({
    id,
    style: {
      left: `${random(0, 92)}%`,
      width: `${random(2, 3.6)}rem`,
      animationDuration: `${random(2.4, 3.8)}s`,
      animationDelay: `${random(-3.8, 0)}s`,
      '--drift': `${random(-14, 14)}vw`,
      '--ball-color': pick(PALETTE),
    } as Record<string, string>,
  }))
})

const streamers = computed(() => {
  if (props.variant !== 'streamers') return []
  return Array.from({ length: 40 }, (_, id) => ({
    id,
    style: {
      left: `${random(0, 100)}%`,
      height: `${random(3.5, 6.5)}rem`,
      backgroundColor: pick(PALETTE),
      animationDuration: `${random(3, 5)}s`,
      animationDelay: `${random(-5, 0)}s`,
      '--sway': `${random(-14, 14)}vw`,
      '--spin': `${random(540, 1260)}deg`,
    } as Record<string, string>,
  }))
})

const bubbles = computed(() => {
  if (props.variant !== 'bubbles') return []
  return Array.from({ length: 26 }, (_, id) => ({
    id,
    style: {
      left: `${random(0, 96)}%`,
      width: `${random(1.2, 3.6)}rem`,
      animationDuration: `${random(3.5, 6)}s`,
      animationDelay: `${random(-6, 0)}s`,
      '--sway': `${random(1.5, 4)}vw`,
      '--bubble-tint': pick(PALETTE),
    } as Record<string, string>,
  }))
})

const shockwaves = computed(() => {
  if (props.variant !== 'shockwave') return []
  return Array.from({ length: 7 }, (_, id) => ({
    id,
    style: {
      borderColor: pick(PALETTE),
      animationDuration: `${random(1.4, 2.2)}s`,
      animationDelay: `${id * 0.28}s`,
    } as Record<string, string>,
  }))
})

const lasers = computed(() => {
  if (props.variant !== 'laser-show') return []
  return Array.from({ length: 9 }, (_, id) => ({
    id,
    style: {
      left: `${random(8, 92)}%`,
      animationDuration: `${random(1.8, 3.6)}s`,
      animationDelay: `${random(-3.6, 0)}s`,
      '--beam-color': pick(PALETTE),
      '--sweep': `${random(28, 60)}deg`,
    } as Record<string, string>,
  }))
})
</script>

<style scoped>
.confetti {
  position: absolute;
  top: -5vh;
  border-radius: 2px;
  animation-name: confetti-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform;
}

@keyframes confetti-fall {
  0% {
    transform: translate3d(0, -10vh, 0) rotateZ(0deg) rotateX(0deg);
  }

  100% {
    transform: translate3d(var(--sway), 115vh, 0) rotateZ(var(--spin)) rotateX(720deg);
  }
}

.firework {
  position: absolute;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  opacity: 0;
  animation-name: firework-burst;
  animation-timing-function: cubic-bezier(0.12, 0.8, 0.4, 1);
  animation-iteration-count: infinite;
  will-change: transform, opacity;
}

@keyframes firework-burst {
  0% {
    opacity: 1;
    transform: translate(0, 0) scale(1);
  }

  70% {
    opacity: 1;
  }

  100% {
    opacity: 0;
    transform: translate(var(--dx), var(--dy)) scale(0.3);
  }
}

.emoji-drop {
  position: absolute;
  top: -8vh;
  animation-name: emoji-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform;
}

@keyframes emoji-fall {
  0% {
    transform: translate3d(0, -10vh, 0) rotate(0deg);
  }

  100% {
    transform: translate3d(var(--sway), 118vh, 0) rotate(var(--spin));
  }
}

.balloon {
  position: absolute;
  bottom: -22vh;
  background: radial-gradient(circle at 32% 28%, rgb(255 255 255 / 55%), var(--balloon-color) 55%);
  border-radius: 50% 50% 50% 50% / 56% 56% 44% 44%;
  animation-name: balloon-rise;
  animation-timing-function: ease-in;
  animation-iteration-count: infinite;
  aspect-ratio: 4 / 5;
  will-change: transform;
}

.balloon::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  width: 2px;
  height: 5rem;
  background: rgb(255 255 255 / 35%);
  transform: translateX(-50%);
}

@keyframes balloon-rise {
  0% {
    transform: translate3d(0, 0, 0) rotate(-4deg);
  }

  50% {
    transform: translate3d(calc(var(--sway) / 2), -70vh, 0) rotate(5deg);
  }

  100% {
    transform: translate3d(var(--sway), -145vh, 0) rotate(-4deg);
  }
}

.sparkle {
  position: absolute;
  text-shadow: 0 0 12px currentcolor;
  transform: scale(0);
  animation-name: sparkle-twinkle;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  will-change: transform, opacity;
}

@keyframes sparkle-twinkle {
  0%,
  100% {
    opacity: 0;
    transform: scale(0) rotate(0deg);
  }

  50% {
    opacity: 1;
    transform: scale(1) rotate(45deg);
  }
}

.ball {
  position: absolute;
  top: 0;
  background: radial-gradient(circle at 32% 28%, rgb(255 255 255 / 60%), var(--ball-color) 60%);
  border-radius: 50%;
  box-shadow: 0 6px 16px rgb(0 0 0 / 35%);
  animation-name: ball-bounce;
  animation-iteration-count: infinite;
  aspect-ratio: 1;
  will-change: transform;
}

@keyframes ball-bounce {
  0% {
    transform: translate3d(0, -12vh, 0);
    animation-timing-function: ease-in;
  }

  32% {
    transform: translate3d(calc(var(--drift) * 0.32), 86vh, 0);
    animation-timing-function: ease-out;
  }

  55% {
    transform: translate3d(calc(var(--drift) * 0.55), 46vh, 0);
    animation-timing-function: ease-in;
  }

  74% {
    transform: translate3d(calc(var(--drift) * 0.74), 86vh, 0);
    animation-timing-function: ease-out;
  }

  87% {
    transform: translate3d(calc(var(--drift) * 0.87), 66vh, 0);
    animation-timing-function: ease-in;
  }

  100% {
    transform: translate3d(var(--drift), 86vh, 0);
  }
}

.streamer {
  position: absolute;
  top: -10vh;
  width: 6px;
  border-radius: 999px;
  animation-name: streamer-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform;
}

@keyframes streamer-fall {
  0% {
    transform: translate3d(0, -12vh, 0) rotate(0deg) skewX(0deg);
  }

  50% {
    transform: translate3d(calc(var(--sway) / 2), 50vh, 0) rotate(calc(var(--spin) / 2))
      skewX(18deg);
  }

  100% {
    transform: translate3d(var(--sway), 118vh, 0) rotate(var(--spin)) skewX(0deg);
  }
}

.bubble {
  position: absolute;
  bottom: -12vh;
  background: radial-gradient(
    circle at 30% 30%,
    rgb(255 255 255 / 50%),
    color-mix(in srgb, var(--bubble-tint) 30%, transparent) 65%
  );
  border: 2px solid rgb(255 255 255 / 45%);
  border-radius: 50%;
  animation-name: bubble-rise;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  aspect-ratio: 1;
  will-change: transform, opacity;
}

@keyframes bubble-rise {
  0% {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(0.9);
  }

  25% {
    transform: translate3d(var(--sway), -30vh, 0) scale(1);
  }

  50% {
    transform: translate3d(calc(var(--sway) * -1), -58vh, 0) scale(1.05);
  }

  75% {
    opacity: 1;
    transform: translate3d(var(--sway), -86vh, 0) scale(1.1);
  }

  100% {
    opacity: 0;
    transform: translate3d(0, -115vh, 0) scale(1.2);
  }
}

.shockwave {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 14vmax;
  height: 14vmax;
  margin: -7vmax 0 0 -7vmax;
  border-width: 4px;
  border-style: solid;
  border-radius: 50%;
  box-shadow: 0 0 24px currentcolor;
  transform: scale(0);
  animation-name: shockwave-expand;
  animation-timing-function: cubic-bezier(0.2, 0.7, 0.4, 1);
  animation-iteration-count: infinite;
  will-change: transform, opacity;
}

@keyframes shockwave-expand {
  0% {
    opacity: 1;
    transform: scale(0);
  }

  100% {
    opacity: 0;
    transform: scale(9);
  }
}

.laser {
  position: absolute;
  bottom: -5vh;
  width: 5px;
  height: 130vmax;
  background: linear-gradient(to top, var(--beam-color), transparent 85%);
  opacity: 0.7;
  filter: blur(1.5px) drop-shadow(0 0 8px var(--beam-color));
  transform-origin: bottom center;
  animation-name: laser-sweep;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
  animation-direction: alternate;
  will-change: transform;
}

@keyframes laser-sweep {
  0% {
    transform: rotate(calc(var(--sweep) * -1));
  }

  100% {
    transform: rotate(var(--sweep));
  }
}
</style>
