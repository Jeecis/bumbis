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
          Home
        </RouterLink>
      </div>

      <!-- Wheel missing / expired -->
      <div
        v-if="notFound"
        class="bg-surface-container-low rounded-[2rem] p-10 text-center shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
      >
        <span class="material-symbols-outlined text-6xl text-secondary">link_off</span>
        <h2 class="text-2xl font-black tracking-tight mt-4">This wheel is gone</h2>
        <p class="text-on-surface-variant mt-2">
          The link is invalid or the wheel expired. Start a fresh one.
        </p>
        <button
          type="button"
          class="pressurized-gradient-primary rounded-full px-8 py-4 mt-6 text-white font-extrabold uppercase tracking-wide hover:brightness-110 transition-all"
          @click="startNew"
        >
          Start a new wheel
        </button>
      </div>

      <template v-else>
        <!-- Share -->
        <div
          class="bg-surface-container-low rounded-[2rem] p-6 mb-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)] flex flex-wrap items-center justify-between gap-4"
        >
          <div class="min-w-0">
            <p class="text-on-surface-variant uppercase font-black tracking-widest text-xs">
              Share this link
            </p>
            <p class="font-bold truncate text-on-surface">{{ shareUrl }}</p>
          </div>
          <button
            type="button"
            class="bg-primary/15 px-5 py-3 rounded-full text-sm font-extrabold uppercase tracking-wide text-primary hover:bg-primary/25 transition-colors shrink-0"
            @click="copyLink"
          >
            {{ copied ? 'Copied!' : 'Copy link' }}
          </button>
        </div>

        <!-- Live connection hint -->
        <p
          v-if="connectionLost"
          class="text-secondary text-sm font-bold mb-4 px-2 flex items-center gap-2"
        >
          <span class="material-symbols-outlined text-base">sync_problem</span>
          Reconnecting to live updates…
        </p>

        <section class="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-10">
          <div
            class="bg-surface-container-low rounded-[2rem] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
          >
            <div class="flex items-center justify-between gap-4 mb-6">
              <div>
                <p class="text-on-surface-variant uppercase font-black tracking-widest text-sm">
                  Wheel
                </p>
                <h2 class="text-2xl font-black tracking-tight">Pick a random spinner</h2>
              </div>
              <div class="text-right">
                <p class="text-on-surface-variant uppercase tracking-widest text-xs">Players</p>
                <p class="text-3xl font-black text-primary">{{ wheelNames.length }}</p>
              </div>
            </div>

            <div class="relative flex items-center justify-center py-8">
              <div class="relative w-[22rem] h-[22rem] max-w-full max-h-full">
                <div class="absolute top-1/2 -right-8 -translate-y-1/2 z-20">
                  <div
                    class="w-0 h-0 border-t-[18px] border-b-[18px] border-r-[32px] border-t-transparent border-b-transparent border-r-secondary drop-shadow-[0_6px_12px_rgba(0,0,0,0.35)]"
                  />
                </div>

                <div
                  class="relative w-full h-full rounded-full border-[10px] border-surface-container-highest bg-surface shadow-[0_30px_60px_rgba(0,0,0,0.35)] overflow-hidden"
                >
                  <div
                    class="absolute inset-0 rounded-full transition-transform ease-out"
                    :style="wheelStyle"
                  >
                    <div
                      v-for="(segment, index) in wheelSegments"
                      :key="`${segment.name}-${index}`"
                      class="absolute inset-0"
                      :style="segmentStyle(index)"
                    />

                    <svg
                      class="absolute inset-0 h-full w-full pointer-events-none"
                      viewBox="0 0 352 352"
                    >
                      <text
                        v-for="label in wheelLabels"
                        :key="`${label.name}-${label.index}`"
                        :x="label.x"
                        :y="label.y"
                        :transform="`rotate(${label.rotation} ${label.x} ${label.y})`"
                        class="fill-white select-none"
                        dominant-baseline="middle"
                        text-anchor="start"
                      >
                        {{ label.name }}
                      </text>
                    </svg>
                  </div>

                  <div
                    class="absolute inset-[6.25rem] rounded-full bg-surface flex items-center justify-center border border-white/10"
                  >
                    <div class="text-center px-6">
                      <p class="text-on-surface-variant uppercase tracking-[0.3em] text-xs">
                        Result
                      </p>
                      <p class="text-2xl font-black tracking-tight mt-2 break-words">
                        {{ selectedName || 'Spin me' }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-8 flex flex-wrap items-center gap-4 justify-between">
              <div class="space-y-3">
                <label class="flex items-center gap-3 cursor-pointer select-none w-fit">
                  <button
                    type="button"
                    role="switch"
                    :aria-checked="useDativaColors"
                    class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200"
                    :class="useDativaColors ? 'bg-primary' : 'bg-surface-container-highest'"
                    @click="toggleDativa"
                  >
                    <span
                      class="inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200"
                      :class="useDativaColors ? 'translate-x-6' : 'translate-x-1'"
                    />
                  </button>
                  <span class="text-sm font-extrabold uppercase tracking-wide text-on-surface">
                    Dativa krāsas
                  </span>
                </label>
                <p class="text-on-surface-variant text-sm">
                  Anyone can spin — everyone sees the same result land live.
                </p>
              </div>
              <button
                type="button"
                class="pressurized-gradient-primary rounded-full px-8 py-4 text-white font-extrabold uppercase tracking-wide shadow-[0_20px_40px_rgba(0,0,0,0.35)] hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="!canSpin || spinning || busy"
                @click="spin"
              >
                {{ spinning ? 'Spinning...' : 'Spin the wheel' }}
              </button>
            </div>
          </div>

          <div class="space-y-8">
            <!-- Add spinners -->
            <div
              class="bg-surface-container-low rounded-[2rem] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
            >
              <div class="flex items-center justify-between gap-4 mb-3">
                <p class="text-on-surface-variant uppercase font-black tracking-widest text-sm">
                  Add spinners
                </p>
                <button
                  v-if="availableSpinners.length > 0"
                  type="button"
                  class="bg-primary/15 px-4 py-2 rounded-full text-sm font-extrabold uppercase tracking-wide text-primary hover:bg-primary/25 transition-colors disabled:opacity-50"
                  :disabled="busy"
                  @click="addAllSpinners"
                >
                  Select all
                </button>
              </div>
              <form class="relative" @submit.prevent="addSpinner">
                <input
                  v-model="addNameInput"
                  class="w-full bg-surface-container-high border-none rounded-full py-5 px-7 text-lg font-bold focus:ring-2 focus:ring-primary-dim transition-all outline-none placeholder:text-outline-variant text-on-surface"
                  placeholder="Add someone by name"
                  type="text"
                  maxlength="40"
                />
                <button
                  type="submit"
                  class="absolute right-3 top-1/2 -translate-y-1/2 bg-primary text-on-primary w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                  :disabled="busy || !addNameInput.trim()"
                >
                  <span class="material-symbols-outlined text-2xl font-bold">add</span>
                </button>
              </form>
              <div v-if="availableSpinners.length > 0" class="flex flex-wrap gap-2 mt-4">
                <button
                  v-for="name in availableSpinners"
                  :key="name"
                  type="button"
                  class="bg-surface-container-high px-4 py-2 rounded-full text-sm font-extrabold tracking-tight hover:bg-surface-container-highest transition-colors disabled:opacity-50"
                  :disabled="busy"
                  @click="addToWheel(name)"
                >
                  {{ name }}
                </button>
              </div>
              <p v-if="errorMsg" class="text-secondary text-sm font-bold mt-3 px-2">
                {{ errorMsg }}
              </p>
            </div>

            <!-- Roster -->
            <div
              class="bg-surface-container-low rounded-[2rem] p-8 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
            >
              <div class="flex items-center justify-between gap-4 mb-5">
                <div>
                  <p class="text-on-surface-variant uppercase font-black tracking-widest text-sm">
                    On the wheel
                  </p>
                  <h2 class="text-2xl font-black tracking-tight">Spinners</h2>
                </div>
                <p class="text-3xl font-black text-primary">{{ wheelNames.length }}</p>
              </div>

              <div v-if="players.length === 0" class="text-outline-variant text-lg font-medium">
                Nobody yet. Share the link and add spinners.
              </div>
              <div v-else class="flex flex-wrap gap-3">
                <div
                  v-for="player in players"
                  :key="player.id"
                  class="bg-surface-container-high text-on-surface px-5 py-3 rounded-full flex items-center gap-3 text-base font-extrabold tracking-tight"
                >
                  <span>{{ player.name }}</span>
                  <button
                    type="button"
                    class="material-symbols-outlined text-on-surface-variant hover:text-secondary transition-colors disabled:opacity-50"
                    :disabled="busy"
                    @click="removeFromWheel(player.id)"
                  >
                    close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </template>
    </main>

    <teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="showWinnerModal"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-6"
          @click.self="closeWinnerModal"
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
              @click="closeWinnerModal"
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
import { wheelSpinners } from '@/utils/defaultBallers'
import {
  createWheel,
  getWheel,
  joinWheel,
  leaveWheel,
  setWheelPalette,
  spinWheel,
  subscribeWheel,
  type WheelState,
} from '@/utils/wheel'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

// Must match SPIN_DURATION_MS on the server (and the wheel's CSS transition).
const SPIN_DURATION_MS = 3000

const wheelId = computed(() => String(route.params.wheelId ?? ''))
const state = ref<WheelState | null>(null)
const notFound = ref(false)
const connectionLost = ref(false)
const addNameInput = ref('')
const busy = ref(false)
const copied = ref(false)
const errorMsg = ref('')

const selectedName = ref('')
const showWinnerModal = ref(false)
const isSpinning = ref(false)
const rotation = ref(0)
const spinDuration = ref(0)
const useDativaColors = ref(false)
const lastSpinId = ref<string | null>(null)

let unsubscribe: (() => void) | null = null
let revealTimeoutId: number | null = null
let copyTimer: number | null = null
let bootstrapping = false

const defaultPalette = [
  '#3e65ff',
  '#6d7eff',
  '#7d4dff',
  '#ff7f50',
  '#ffb347',
  '#00a896',
  '#2ec4b6',
  '#e71d36',
]

// Dativa brand colours.
const dativaPalette = ['#214E24', '#9BDA62', '#5F5FED', '#CCC5B9', '#14080E', '#F6F7EB']

const segmentPalette = computed(() => (useDativaColors.value ? dativaPalette : defaultPalette))

const players = computed(() => state.value?.players ?? [])
const wheelNames = computed(() => players.value.map((p) => p.name))
const spinning = computed(() => state.value?.status === 'spinning')
const canSpin = computed(() => wheelNames.value.length > 0)
const availableSpinners = computed(() =>
  wheelSpinners.filter((name) => !players.value.some((p) => p.name === name)),
)
const shareUrl = computed(() => `${window.location.origin}/wheel/${wheelId.value}`)

const wheelSegments = computed(() => {
  const names = wheelNames.value.length > 0 ? wheelNames.value : ['Add users']
  const palette = segmentPalette.value
  const colors: string[] = []

  names.forEach((_, index) => {
    const prev = colors[index - 1]
    const isLast = index === names.length - 1
    let color = palette[index % palette.length]
    // The wheel is circular, so the last segment also neighbours the first one.
    // If a colour would repeat next to itself, pick the next free colour so two
    // adjacent spinners never share the same colour.
    if (color === prev || (isLast && color === colors[0])) {
      color =
        palette.find((candidate) => candidate !== prev && (!isLast || candidate !== colors[0])) ??
        color
    }
    colors.push(color)
  })

  return names.map((name, index) => ({
    name,
    color: colors[index],
  }))
})

const segmentAngle = computed(() => 360 / wheelSegments.value.length)

const wheelStyle = computed(() => ({
  transform: `rotate(${rotation.value}deg)`,
  transitionDuration: `${spinDuration.value}ms`,
}))

const wheelLabels = computed(() => {
  const center = 176
  // Anchor names just outside the centre hub so each one starts from the inside
  // of the spinner and grows outwards towards the rim.
  const innerRadius = 80

  return wheelSegments.value.map((segment, index) => {
    const centerAngle = segmentAngle.value * index + segmentAngle.value / 2
    const radians = (centerAngle * Math.PI) / 180

    return {
      index,
      name: segment.name,
      // Read radially outwards along each spoke (paired with text-anchor="start").
      rotation: centerAngle - 90,
      x: center + Math.sin(radians) * innerRadius,
      y: center - Math.cos(radians) * innerRadius,
    }
  })
})

function segmentStyle(index: number) {
  const angle = segmentAngle.value
  const start = angle * index
  const end = angle * (index + 1)
  const { color } = wheelSegments.value[index]

  return {
    background: `conic-gradient(from 0deg, transparent ${start}deg, ${color} ${start}deg ${end}deg, transparent ${end}deg 360deg)`,
  }
}

function cancelPendingReveal() {
  if (revealTimeoutId !== null) {
    window.clearTimeout(revealTimeoutId)
    revealTimeoutId = null
  }
}

function scheduleWinnerReveal(name: string) {
  cancelPendingReveal()
  showWinnerModal.value = false
  selectedName.value = ''
  isSpinning.value = true
  revealTimeoutId = window.setTimeout(() => {
    selectedName.value = name
    showWinnerModal.value = true
    isSpinning.value = false
    revealTimeoutId = null
  }, SPIN_DURATION_MS)
}

/** Reconcile local wheel visuals with a fresh server state. */
function handleSpinState(next: WheelState) {
  if (next.status === 'spinning' && next.spin) {
    if (next.spin.id === lastSpinId.value) return
    lastSpinId.value = next.spin.id
    if (bootstrapping) {
      // Joined mid-spin: snap to the current angle without replaying the reveal.
      spinDuration.value = 0
      rotation.value = next.rotation
    } else {
      // A fresh spin seen live: animate to the target, then reveal the winner.
      spinDuration.value = SPIN_DURATION_MS
      rotation.value = next.rotation
      scheduleWinnerReveal(next.spin.winnerName)
    }
  } else {
    // Idle: the winner (if any) has already been removed server-side; settle the
    // wheel at its resting angle without animating.
    spinDuration.value = 0
    rotation.value = next.rotation
    isSpinning.value = false
  }
}

function applyState(next: WheelState) {
  state.value = next
  connectionLost.value = false
  // The colour palette is shared, so mirror whatever the server reports.
  useDativaColors.value = next.dativaColors
  handleSpinState(next)
}

async function toggleDativa() {
  const next = !useDativaColors.value
  useDativaColors.value = next // optimistic; the broadcast confirms for everyone
  try {
    await setWheelPalette(wheelId.value, next)
  } catch {
    useDativaColors.value = !next // revert on failure
  }
}

/** Add someone to the wheel without claiming them as your own identity. */
async function addToWheel(name: string) {
  const trimmed = name.trim()
  if (!trimmed || busy.value) return
  busy.value = true
  errorMsg.value = ''
  try {
    await joinWheel(wheelId.value, trimmed)
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Could not add spinner'
  } finally {
    busy.value = false
  }
}

async function addSpinner() {
  const name = addNameInput.value
  await addToWheel(name)
  if (!errorMsg.value) addNameInput.value = ''
}

/** Add every default spinner not already on the wheel. */
async function addAllSpinners() {
  if (busy.value) return
  const toAdd = [...availableSpinners.value]
  if (toAdd.length === 0) return
  busy.value = true
  errorMsg.value = ''
  try {
    for (const name of toAdd) {
      await joinWheel(wheelId.value, name)
    }
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Could not add spinners'
  } finally {
    busy.value = false
  }
}

/** Remove anyone from the wheel. */
async function removeFromWheel(playerId: string) {
  if (busy.value) return
  busy.value = true
  errorMsg.value = ''
  try {
    await leaveWheel(wheelId.value, playerId)
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Could not remove spinner'
  } finally {
    busy.value = false
  }
}

async function spin() {
  if (!canSpin.value || spinning.value || busy.value) return
  busy.value = true
  errorMsg.value = ''
  try {
    // The server decides the winner and broadcasts the spin; the resulting SSE
    // event drives the animation here (and on every other client).
    await spinWheel(wheelId.value)
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Could not spin'
  } finally {
    busy.value = false
  }
}

function closeWinnerModal() {
  showWinnerModal.value = false
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    copied.value = true
    if (copyTimer) window.clearTimeout(copyTimer)
    copyTimer = window.setTimeout(() => (copied.value = false), 2000)
  } catch {
    errorMsg.value = 'Copy failed — select the link manually'
  }
}

async function startNew() {
  const { id } = await createWheel()
  router.push(`/wheel/${id}`)
}

async function load() {
  unsubscribe?.()
  unsubscribe = null
  cancelPendingReveal()
  notFound.value = false
  state.value = null
  lastSpinId.value = null
  selectedName.value = ''
  showWinnerModal.value = false
  isSpinning.value = false

  const id = wheelId.value
  if (!id) {
    notFound.value = true
    return
  }

  bootstrapping = true
  try {
    applyState(await getWheel(id))
  } catch {
    notFound.value = true
    bootstrapping = false
    return
  }
  bootstrapping = false

  unsubscribe = subscribeWheel(id, applyState, () => {
    connectionLost.value = true
  })
}

watch(wheelId, load)
onMounted(load)
onBeforeUnmount(() => {
  unsubscribe?.()
  cancelPendingReveal()
  if (copyTimer) window.clearTimeout(copyTimer)
})
</script>

<style scoped>
svg text {
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: -0.01em;
  paint-order: stroke;
  stroke: rgb(0 0 0 / 45%);
  stroke-linejoin: round;
  stroke-width: 3px;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
</style>
