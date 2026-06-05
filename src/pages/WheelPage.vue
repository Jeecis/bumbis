<template>
  <div class="min-h-screen flex flex-col bg-surface text-on-surface">
    <header class="flex items-center justify-center w-full px-8 py-6 top-0 z-50">
      <div
        class="font-black tracking-[-0.02em] uppercase text-4xl text-primary text-center"
        style="font-family: 'Plus Jakarta Sans', sans-serif"
      >
        BUMBIS
      </div>
    </header>

    <main class="flex-grow container mx-auto px-6 py-12 max-w-6xl pb-28">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-10 px-2">
        <div>
          <p class="text-on-surface-variant uppercase font-black tracking-widest text-sm">
            Random picker
          </p>
          <h1 class="text-4xl font-black tracking-tight">Spin the Wheel</h1>
        </div>
        <RouterLink
          to="/"
          class="bg-surface-container-high px-5 py-3 rounded-full text-sm font-extrabold uppercase tracking-wide text-on-surface hover:bg-surface-container-highest transition-colors"
        >
          Back to pairs
        </RouterLink>
      </div>

      <section class="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-10">
        <div
          class="bg-surface-container-low rounded-[2rem] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
        >
          <div class="flex items-center justify-between gap-4 mb-6">
            <div>
              <p class="text-on-surface-variant uppercase font-black tracking-widest text-sm">
                Wheel
              </p>
              <h2 class="text-2xl font-black tracking-tight">Pick a random baller</h2>
            </div>
            <div class="text-right">
              <p class="text-on-surface-variant uppercase tracking-widest text-xs">Players</p>
              <p class="text-3xl font-black text-primary">{{ wheelNames.length }}</p>
            </div>
          </div>

          <div class="relative flex items-center justify-center py-8">
            <div class="absolute top-0 left-1/2 -translate-x-1/2 z-20">
              <div
                class="w-0 h-0 border-l-[18px] border-r-[18px] border-t-[32px] border-l-transparent border-r-transparent border-t-secondary drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)]"
              />
            </div>

            <div
              class="relative w-[22rem] h-[22rem] max-w-full max-h-full rounded-full border-[10px] border-surface-container-highest bg-surface shadow-[0_30px_60px_rgba(0,0,0,0.35)] overflow-hidden"
            >
              <div
                class="absolute inset-0 rounded-full transition-transform duration-[3000ms] ease-out"
                :style="wheelStyle"
              >
                <div
                  v-for="(segment, index) in wheelSegments"
                  :key="`${segment.name}-${index}`"
                  class="absolute inset-0"
                  :style="segmentStyle(index)"
                >
                  <div
                    class="absolute left-1/2 top-1/2 origin-bottom text-sm font-black uppercase tracking-wide text-white text-center select-none"
                    :style="segmentLabelStyle(index)"
                  >
                    {{ segment.name }}
                  </div>
                </div>
              </div>

              <div
                class="absolute inset-[5.25rem] rounded-full bg-surface flex items-center justify-center border border-white/10"
              >
                <div class="text-center px-6">
                  <p class="text-on-surface-variant uppercase tracking-[0.3em] text-xs">Result</p>
                  <p class="text-2xl font-black tracking-tight mt-2 break-words">
                    {{ selectedName || 'Spin me' }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div class="mt-8 flex flex-wrap items-center gap-4 justify-between">
            <p class="text-on-surface-variant text-sm">
              Spins for 3 seconds and lands on a random selected user.
            </p>
            <button
              type="button"
              class="pressurized-gradient-primary rounded-full px-8 py-4 text-white font-extrabold uppercase tracking-wide shadow-[0_20px_40px_rgba(0,0,0,0.35)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="wheelNames.length === 0 || isSpinning"
              @click="spinWheel"
            >
              {{ isSpinning ? 'Spinning...' : 'Spin the wheel' }}
            </button>
          </div>
        </div>

        <div class="space-y-8">
          <div
            class="bg-surface-container-low rounded-[2rem] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
          >
            <div class="flex items-center justify-between gap-4 mb-5">
              <div>
                <p class="text-on-surface-variant uppercase font-black tracking-widest text-sm">
                  Default ballers
                </p>
                <h2 class="text-2xl font-black tracking-tight">Quick add</h2>
              </div>
              <button
                v-if="availableDefaultBallers.length > 0"
                type="button"
                class="bg-primary/15 px-4 py-2 rounded-full text-sm font-extrabold uppercase tracking-wide text-primary hover:bg-primary/25 transition-colors"
                @click="addAllDefaultPeople"
              >
                Select all
              </button>
            </div>

            <div class="flex flex-wrap gap-3">
              <button
                v-for="name in availableDefaultBallers"
                :key="name"
                type="button"
                class="bg-surface-container-high px-5 py-3 rounded-full text-base font-extrabold tracking-tight hover:bg-surface-container-highest transition-colors"
                @click="addDefaultPerson(name)"
              >
                {{ name }}
              </button>
            </div>
          </div>

          <div
            class="bg-surface-container-low rounded-[2rem] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
          >
            <p class="text-on-surface-variant uppercase font-black tracking-widest text-sm mb-2">
              Add baller
            </p>
            <form class="relative" @submit.prevent="addPerson">
              <input
                v-model="newName"
                class="w-full bg-surface-container-high border-none rounded-full py-5 px-7 text-lg font-bold focus:ring-2 focus:ring-primary-dim transition-all outline-none placeholder:text-outline-variant text-on-surface"
                placeholder="Type a name"
                type="text"
              />
              <button
                type="submit"
                class="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-on-primary w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all"
              >
                <span class="material-symbols-outlined text-2xl font-bold">add</span>
              </button>
            </form>
          </div>

          <div
            class="bg-surface-container-low rounded-[2rem] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
          >
            <div class="flex items-center justify-between gap-4 mb-5">
              <div>
                <p class="text-on-surface-variant uppercase font-black tracking-widest text-sm">
                  Selected users
                </p>
                <h2 class="text-2xl font-black tracking-tight">Wheel roster</h2>
              </div>
              <button
                v-if="wheelNames.length > 0"
                type="button"
                class="bg-secondary/15 px-4 py-2 rounded-full text-sm font-extrabold uppercase tracking-wide text-secondary hover:bg-secondary/25 transition-colors"
                @click="clearAll"
              >
                Clear all
              </button>
            </div>

            <div v-if="wheelNames.length === 0" class="text-outline-variant text-lg font-medium">
              No users selected yet.
            </div>
            <div v-else class="flex flex-wrap gap-3">
              <div
                v-for="name in wheelNames"
                :key="name"
                class="bg-surface-container-high px-5 py-3 rounded-full flex items-center gap-3"
              >
                <span class="text-base font-extrabold tracking-tight">{{ name }}</span>
                <button
                  type="button"
                  class="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-colors"
                  @click="removePerson(name)"
                >
                  close
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="showWinnerModal"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6"
          @click.self="showWinnerModal = false"
        >
          <div
            class="w-full max-w-md rounded-[2rem] bg-surface-container p-8 text-center shadow-[0_30px_80px_rgba(0,0,0,0.55)] border border-white/10"
            role="dialog"
            aria-modal="true"
            aria-labelledby="wheel-winner-title"
          >
            <p class="text-on-surface-variant uppercase font-black tracking-[0.3em] text-xs mb-3">
              Chosen user
            </p>
            <h3
              id="wheel-winner-title"
              class="text-4xl font-black tracking-tight text-primary mb-6 break-words"
            >
              {{ selectedName }}
            </h3>
            <button
              type="button"
              class="pressurized-gradient-primary rounded-full px-8 py-4 text-white font-extrabold uppercase tracking-wide hover:brightness-110 transition-all"
              @click="showWinnerModal = false"
            >
              Nice
            </button>
          </div>
        </div>
      </transition>
    </teleport>

    <div
      class="fixed -top-24 -left-24 w-96 h-96 bg-primary opacity-5 blur-[120px] rounded-full pointer-events-none"
    />
    <div
      class="fixed top-1/2 -right-24 w-64 h-64 bg-secondary opacity-5 blur-[100px] rounded-full pointer-events-none"
    />
  </div>
</template>

<script setup lang="ts">
import { defaultBallers } from '@/utils/defaultBallers'
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

const wheelNames = ref<string[]>([])
const newName = ref('')
const selectedName = ref('')
const showWinnerModal = ref(false)
const isSpinning = ref(false)
const rotation = ref(0)
let spinTimeoutId: number | null = null

const segmentPalette = [
  '#3e65ff',
  '#6d7eff',
  '#7d4dff',
  '#ff7f50',
  '#ffb347',
  '#00a896',
  '#2ec4b6',
  '#e71d36',
]

const availableDefaultBallers = computed(() =>
  defaultBallers.filter((name) => !wheelNames.value.includes(name)),
)

const wheelSegments = computed(() => {
  const names = wheelNames.value.length > 0 ? wheelNames.value : ['Add users']
  return names.map((name, index) => ({
    name,
    color: segmentPalette[index % segmentPalette.length],
  }))
})

const segmentAngle = computed(() => 360 / wheelSegments.value.length)

const wheelStyle = computed(() => ({
  transform: `rotate(${rotation.value}deg)`,
}))

function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

function addPerson() {
  const trimmed = normalizeName(newName.value)
  if (!trimmed) return
  if (wheelNames.value.includes(trimmed)) return
  wheelNames.value.push(trimmed)
  newName.value = ''
}

function addDefaultPerson(name: string) {
  if (wheelNames.value.includes(name)) return
  wheelNames.value.push(name)
}

function addAllDefaultPeople() {
  wheelNames.value.push(...availableDefaultBallers.value)
}

function removePerson(name: string) {
  wheelNames.value = wheelNames.value.filter((entry) => entry !== name)
}

function cancelPendingSpin() {
  if (spinTimeoutId !== null) {
    window.clearTimeout(spinTimeoutId)
    spinTimeoutId = null
  }
}

function clearAll() {
  cancelPendingSpin()
  wheelNames.value = []
  selectedName.value = ''
  showWinnerModal.value = false
  isSpinning.value = false
}

function segmentStyle(index: number) {
  const angle = segmentAngle.value
  const start = angle * index
  const end = angle * (index + 1)
  const { color } = wheelSegments.value[index]

  return {
    background: `conic-gradient(from -90deg, transparent ${start}deg, ${color} ${start}deg ${end}deg, transparent ${end}deg 360deg)`,
  }
}

function segmentLabelStyle(index: number) {
  const angle = segmentAngle.value
  const centerAngle = angle * index + angle / 2

  return {
    width: '7rem',
    transform: `translate(-50%, -100%) rotate(${centerAngle}deg) translateY(-7.7rem) rotate(${90}deg)`,
    textShadow: '0 2px 6px rgba(0,0,0,0.45)',
  }
}

function spinWheel() {
  if (isSpinning.value || wheelNames.value.length === 0) return

  cancelPendingSpin()
  const winnerIndex = Math.floor(Math.random() * wheelNames.value.length)
  const winnerName = wheelNames.value[winnerIndex]
  const centerAngle = segmentAngle.value * winnerIndex + segmentAngle.value / 2
  const extraTurns = 360 * 6
  const targetRotation = extraTurns + (360 - centerAngle)

  isSpinning.value = true
  showWinnerModal.value = false
  selectedName.value = ''
  rotation.value += targetRotation

  spinTimeoutId = window.setTimeout(() => {
    selectedName.value = winnerName
    isSpinning.value = false
    showWinnerModal.value = true
    spinTimeoutId = null
  }, 3000)
}
</script>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
