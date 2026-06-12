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

    <main class="flex-grow container mx-auto px-4 sm:px-6 py-4 max-w-3xl pb-28">
      <!-- Page header -->
      <div class="flex flex-wrap items-center justify-between gap-4 mb-8 px-2">
        <div>
          <p class="text-on-surface-variant uppercase font-black tracking-widest text-sm">
            High Stakes
          </p>
          <h1 class="text-4xl font-black tracking-tight">ELO Casino</h1>
        </div>
        <div class="flex gap-3">
          <RouterLink
            to="/results?tab=rankings"
            class="bg-surface-container-high px-5 py-3 rounded-full text-sm font-extrabold uppercase tracking-wide text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            Rankings
          </RouterLink>
          <RouterLink
            to="/"
            class="bg-surface-container-high px-5 py-3 rounded-full text-sm font-extrabold uppercase tracking-wide text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            Home
          </RouterLink>
        </div>
      </div>

      <!-- Tab bar -->
      <div class="flex gap-2 bg-surface-container rounded-full p-1.5 mb-8">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :class="[
            activeTab === tab.id
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container-high',
            'flex-1 py-3 rounded-full font-extrabold uppercase tracking-wide text-sm transition-colors',
          ]"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- ── PLAY TAB ─────────────────────────────────────────────────── -->
      <div v-if="activeTab === 'play'" class="space-y-6">
        <!-- Player picker -->
        <div
          class="bg-surface-container-low rounded-[2rem] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
        >
          <p class="text-on-surface-variant uppercase font-black tracking-widest text-xs mb-3">
            Who's feeling lucky?
          </p>
          <div class="relative">
            <input
              v-model="playerQuery"
              class="w-full bg-surface-container-high border-none rounded-full py-4 px-6 font-bold focus:ring-2 focus:ring-primary-dim transition-all outline-none placeholder:text-outline-variant"
              placeholder="Search a baller…"
              @focus="pickerOpen = true"
              @input="selectedPlayer = null"
            />
            <button
              v-if="selectedPlayer"
              type="button"
              class="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-secondary transition-colors"
              @click="clearPlayer"
            >
              <span class="material-symbols-outlined">close</span>
            </button>
            <!-- Suggestion dropdown -->
            <div
              v-if="pickerOpen && !selectedPlayer && filteredPlayers.length > 0"
              class="absolute top-full left-0 right-0 mt-2 bg-surface-container-highest rounded-2xl shadow-xl z-20 overflow-hidden py-1 max-h-72 overflow-y-auto"
            >
              <button
                v-for="p in filteredPlayers"
                :key="p.name"
                type="button"
                class="w-full px-6 py-3 text-left flex items-center justify-between hover:bg-primary/10 transition-colors"
                @mousedown.prevent="selectPlayer(p)"
              >
                <span class="font-extrabold tracking-tight">{{ p.name }}</span>
                <span class="font-black text-primary tabular-nums">{{ p.rating }}</span>
              </button>
            </div>
          </div>

          <!-- Selected player's bankroll -->
          <transition name="fade">
            <div
              v-if="selectedPlayer"
              class="mt-5 flex items-center justify-between bg-surface-container rounded-2xl px-6 py-4"
            >
              <div>
                <p class="text-on-surface-variant uppercase font-black tracking-widest text-xs">
                  Current ELO
                </p>
                <p
                  class="text-2xl font-black tracking-tight"
                  style="font-family: 'Plus Jakarta Sans', sans-serif"
                >
                  {{ selectedPlayer.name }}
                </p>
              </div>
              <span
                class="text-4xl font-black text-primary tabular-nums"
                style="font-family: 'Plus Jakarta Sans', sans-serif"
                >{{ selectedPlayer.rating }}</span
              >
            </div>
          </transition>
        </div>

        <!-- Wager controls -->
        <div
          v-if="selectedPlayer"
          class="bg-surface-container-low rounded-[2rem] p-6 shadow-[0_20px_40px_rgba(0,0,0,0.35)] space-y-5"
        >
          <div class="flex items-center justify-between">
            <p class="text-on-surface-variant uppercase font-black tracking-widest text-xs">
              Your wager
            </p>
            <p class="text-on-surface-variant text-xs font-bold">
              Max <span class="text-on-surface">{{ maxWager }}</span> · floor {{ RATING_FLOOR }}
            </p>
          </div>

          <div v-if="maxWager < 1" class="text-secondary text-sm font-bold">
            {{ selectedPlayer.name }} is sitting on the floor — nothing left to risk.
          </div>

          <template v-else>
            <div class="flex items-center gap-4 justify-center">
              <button
                type="button"
                class="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-2xl font-black hover:bg-surface-container-highest active:scale-95 transition-all disabled:opacity-30"
                :disabled="wager <= 1"
                @click="wager = Math.max(1, wager - 5)"
              >
                −
              </button>
              <input
                :value="wager"
                type="number"
                min="1"
                :max="maxWager"
                class="text-5xl font-black w-32 text-center bg-transparent outline-none border-b-2 border-transparent focus:border-primary transition-colors text-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                style="font-family: 'Plus Jakarta Sans', sans-serif"
                @input="setWager(($event.target as HTMLInputElement).value)"
              />
              <button
                type="button"
                class="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-2xl font-black hover:bg-surface-container-highest active:scale-95 transition-all disabled:opacity-30"
                :disabled="wager >= maxWager"
                @click="wager = Math.min(maxWager, wager + 5)"
              >
                +
              </button>
            </div>

            <input
              v-model.number="wager"
              type="range"
              min="1"
              :max="maxWager"
              class="w-full accent-primary"
            />

            <div class="flex flex-wrap gap-2 justify-center">
              <button
                v-for="q in quickWagers"
                :key="q.label"
                type="button"
                class="bg-surface-container px-4 py-2 rounded-full text-xs font-extrabold uppercase tracking-wide hover:bg-surface-container-high transition-colors disabled:opacity-30"
                :disabled="q.value() < 1"
                @click="wager = Math.min(maxWager, Math.max(1, q.value()))"
              >
                {{ q.label }}
              </button>
            </div>

            <p class="text-center text-on-surface-variant text-sm font-bold">
              50/50 — win <span class="text-green-500">+{{ wager }}</span> or lose
              <span class="text-red-500">−{{ wager }}</span>
            </p>
          </template>
        </div>

        <p v-if="playError" class="text-secondary text-sm font-bold px-2">{{ playError }}</p>
      </div>

      <!-- ── HISTORY TAB ──────────────────────────────────────────────── -->
      <div v-if="activeTab === 'history'" class="space-y-3">
        <div v-if="loadingHistory" class="text-on-surface-variant text-lg font-medium px-2">
          Loading history…
        </div>
        <div
          v-else-if="history.length === 0"
          class="bg-surface-container-low rounded-[2rem] p-10 text-center shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
        >
          <span class="material-symbols-outlined text-6xl text-outline-variant">casino</span>
          <p class="text-on-surface-variant font-bold mt-4">No bets placed yet.</p>
          <button
            type="button"
            class="mt-4 bg-primary/15 px-5 py-3 rounded-full text-sm font-extrabold uppercase tracking-wide text-primary hover:bg-primary/25 transition-colors"
            @click="activeTab = 'play'"
          >
            Place a bet
          </button>
        </div>
        <div
          v-for="g in history"
          :key="g.id"
          :class="[
            g.outcome === 'win'
              ? 'bg-green-500/5 ring-1 ring-green-500/20'
              : 'bg-red-500/5 ring-1 ring-red-500/20',
            'rounded-2xl px-5 py-4 flex items-center justify-between gap-4',
          ]"
        >
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span
                class="material-symbols-outlined text-lg"
                :class="g.outcome === 'win' ? 'text-green-500' : 'text-red-500'"
                style="font-variation-settings: 'FILL' 1"
                >{{ g.outcome === 'win' ? 'trending_up' : 'trending_down' }}</span
              >
              <span class="font-extrabold tracking-tight truncate">{{ g.name }}</span>
            </div>
            <p class="text-xs font-bold text-on-surface-variant mt-0.5">
              {{ formatDate(g.createdAt) }} · risked {{ g.wager }}
            </p>
          </div>
          <div class="text-right shrink-0">
            <p
              class="font-black text-lg"
              :class="g.outcome === 'win' ? 'text-green-500' : 'text-red-500'"
            >
              {{ g.delta > 0 ? '+' : '' }}{{ g.delta }}
            </p>
            <p class="text-xs font-bold text-on-surface-variant tabular-nums">
              {{ g.ratingBefore }} → {{ g.ratingAfter }}
            </p>
          </div>
        </div>
      </div>
    </main>

    <!-- Bottom action: gamble -->
    <div
      v-if="activeTab === 'play'"
      class="fixed bottom-0 left-0 w-full z-40 flex justify-center pb-10 px-6"
    >
      <div class="fixed bottom-8 px-6 w-full max-w-md">
        <button
          :disabled="!canGamble || gambling"
          class="flex items-center justify-center pressurized-gradient-primary rounded-full py-5 w-full shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:brightness-110 hover:scale-[1.02] transition-all active:scale-95 duration-150 disabled:opacity-50 disabled:hover:scale-100"
          @click="requireAuth(doGamble)"
        >
          <span
            class="material-symbols-outlined mr-3 text-3xl text-white"
            style="font-variation-settings: 'FILL' 1"
            >casino</span
          >
          <span
            class="font-extrabold text-lg tracking-tight uppercase text-white"
            style="font-family: 'Plus Jakarta Sans', sans-serif"
          >
            {{
              gambling ? 'Rolling…' : selectedPlayer ? `Gamble ${wager} ELO` : 'Pick a baller first'
            }}
          </span>
        </button>
      </div>
    </div>

    <!-- Result reveal modal -->
    <transition name="fade">
      <div
        v-if="lastResult"
        class="fixed inset-0 z-50 flex items-center justify-center px-6"
        @click="lastResult = null"
      >
        <div class="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div
          :class="[
            lastResult.outcome === 'win' ? 'ring-2 ring-green-500/50' : 'ring-2 ring-red-500/50',
            'relative bg-surface-container-low rounded-[2rem] p-10 w-full max-w-sm text-center shadow-[0_40px_80px_rgba(0,0,0,0.6)]',
          ]"
        >
          <div
            :class="lastResult.outcome === 'win' ? 'text-green-500' : 'text-red-500'"
            class="text-7xl mb-4 result-pop"
          >
            <span
              class="material-symbols-outlined text-7xl"
              style="font-variation-settings: 'FILL' 1"
              >{{
                lastResult.outcome === 'win' ? 'celebration' : 'sentiment_very_dissatisfied'
              }}</span
            >
          </div>
          <p
            class="text-3xl font-black tracking-tight uppercase mb-1"
            :class="lastResult.outcome === 'win' ? 'text-green-500' : 'text-red-500'"
            style="font-family: 'Plus Jakarta Sans', sans-serif"
          >
            {{ lastResult.outcome === 'win' ? 'Winner!' : 'Wiped out' }}
          </p>
          <p class="text-on-surface-variant font-bold mb-5">
            {{ lastResult.name }}
            {{ lastResult.outcome === 'win' ? 'doubled' : 'dropped' }}
            {{ lastResult.wager }} ELO
          </p>
          <div class="flex items-center justify-center gap-3 text-2xl font-black tabular-nums">
            <span class="text-on-surface-variant">{{ lastResult.ratingBefore }}</span>
            <span class="material-symbols-outlined text-on-surface-variant">arrow_forward</span>
            <span :class="lastResult.outcome === 'win' ? 'text-green-500' : 'text-red-500'">{{
              lastResult.ratingAfter
            }}</span>
          </div>
          <button
            type="button"
            class="mt-7 w-full py-3 rounded-full bg-surface-container-high font-extrabold uppercase tracking-wide text-sm hover:bg-surface-container-highest transition-colors"
            @click="lastResult = null"
          >
            {{ lastResult.outcome === 'win' ? 'Cash out' : 'Try again' }}
          </button>
        </div>
      </div>
    </transition>

    <!-- Auth modal -->
    <transition name="fade">
      <div v-if="authModalOpen" class="fixed inset-0 z-50 flex items-center justify-center px-6">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="cancelAuth" />
        <div
          class="relative bg-surface-container-low rounded-[2rem] p-8 w-full max-w-sm shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
        >
          <h2
            class="text-xl font-black tracking-tight mb-1"
            style="font-family: 'Plus Jakarta Sans', sans-serif"
          >
            Password required
          </h2>
          <p class="text-on-surface-variant text-sm mb-6">Enter the password to continue.</p>
          <form @submit.prevent="submitAuth">
            <input
              v-model="authPassword"
              type="password"
              placeholder="Password"
              class="w-full bg-surface-container-high border-none rounded-full py-4 px-6 font-bold focus:ring-2 focus:ring-primary transition-all outline-none placeholder:text-outline-variant mb-2"
              autofocus
            />
            <p v-if="authError" class="text-secondary text-sm font-bold px-2 mb-3">
              {{ authError }}
            </p>
            <div class="flex gap-3 mt-4">
              <button
                type="button"
                class="flex-1 py-3 rounded-full bg-surface-container-high font-extrabold uppercase tracking-wide text-sm hover:bg-surface-container-highest transition-colors"
                @click="cancelAuth"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="flex-1 py-3 rounded-full pressurized-gradient-primary text-white font-extrabold uppercase tracking-wide text-sm hover:brightness-110 transition-all"
              >
                Confirm
              </button>
            </div>
          </form>
        </div>
      </div>
    </transition>

    <!-- Background Orbs -->
    <div
      class="fixed -top-24 -left-24 w-96 h-96 bg-primary opacity-5 blur-[120px] rounded-full pointer-events-none"
    />
    <div
      class="fixed top-1/2 -right-24 w-64 h-64 bg-secondary opacity-5 blur-[100px] rounded-full pointer-events-none"
    />
  </div>
</template>

<script setup lang="ts">
import { type Gamble, getGambleHistory, placeGamble } from '@/utils/gamble'
import { type PlayerRanking, getLeaderboard } from '@/utils/matchmaking'
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'

// Mirrors RATING_FLOOR on the server — the wager is capped so a loss can never
// push a player below it. The server is authoritative; this is just for the UI.
const RATING_FLOOR = 800

type Tab = 'play' | 'history'
const tabs: { id: Tab; label: string }[] = [
  { id: 'play', label: 'Play' },
  { id: 'history', label: 'History' },
]
const activeTab = ref<Tab>('play')

// ── Player picker ─────────────────────────────────────────────────────────────
const players = ref<PlayerRanking[]>([])
const playerQuery = ref('')
const pickerOpen = ref(false)
const selectedPlayer = ref<PlayerRanking | null>(null)
const playError = ref('')

const filteredPlayers = computed(() => {
  const q = playerQuery.value.trim().toLowerCase()
  const list = q ? players.value.filter((p) => p.name.toLowerCase().includes(q)) : players.value
  return list.slice(0, 30)
})

function selectPlayer(p: PlayerRanking) {
  selectedPlayer.value = p
  playerQuery.value = p.name
  pickerOpen.value = false
  playError.value = ''
  wager.value = Math.min(maxWager.value, Math.max(1, Math.round(maxWager.value / 2)))
}

function clearPlayer() {
  selectedPlayer.value = null
  playerQuery.value = ''
  pickerOpen.value = true
}

// ── Wager ───────────────────────────────────────────────────────────────────
const wager = ref(10)

const maxWager = computed(() =>
  selectedPlayer.value ? Math.max(0, selectedPlayer.value.rating - RATING_FLOOR) : 0,
)

const quickWagers = [
  { label: 'Min', value: () => 1 },
  { label: '25%', value: () => Math.round(maxWager.value * 0.25) },
  { label: 'Half', value: () => Math.round(maxWager.value * 0.5) },
  { label: 'All in', value: () => maxWager.value },
]

function setWager(raw: string) {
  const n = Math.floor(Number(raw) || 0)
  wager.value = Math.min(maxWager.value, Math.max(1, n))
}

const canGamble = computed(
  () =>
    !!selectedPlayer.value &&
    maxWager.value >= 1 &&
    wager.value >= 1 &&
    wager.value <= maxWager.value,
)

// Keep the wager within the selected player's range at all times.
watch(maxWager, (max) => {
  if (wager.value > max) wager.value = Math.max(1, max)
})

// ── Gamble action ─────────────────────────────────────────────────────────────
const gambling = ref(false)
const lastResult = ref<Gamble | null>(null)

async function doGamble() {
  if (!canGamble.value || gambling.value || !selectedPlayer.value) return
  gambling.value = true
  playError.value = ''
  const name = selectedPlayer.value.name
  try {
    const result = await placeGamble(name, wager.value)
    lastResult.value = result
    // Reflect the new rating locally and refresh history.
    selectedPlayer.value = { ...selectedPlayer.value, rating: result.ratingAfter }
    const inList = players.value.find((p) => p.name === name)
    if (inList) inList.rating = result.ratingAfter
    history.value = [result, ...history.value]
    wager.value = Math.min(maxWager.value, wager.value)
  } catch (err) {
    playError.value = err instanceof Error ? err.message : 'Could not place the bet'
  } finally {
    gambling.value = false
  }
}

// ── History ───────────────────────────────────────────────────────────────────
const history = ref<Gamble[]>([])
const loadingHistory = ref(false)

async function loadHistory() {
  loadingHistory.value = true
  try {
    history.value = await getGambleHistory()
  } finally {
    loadingHistory.value = false
  }
}

watch(activeTab, (tab) => {
  if (tab === 'history') loadHistory()
})

onMounted(() => {
  getLeaderboard()
    .then((lb) => {
      players.value = lb
    })
    .catch(() => {})
  loadHistory()
})

// ── Auth gate (mirrors ResultsPage) ────────────────────────────────────────────
const APP_PASSWORD = '123niga123'
const AUTH_KEY = 'bumbis:auth'
const isAuthenticated = ref(localStorage.getItem(AUTH_KEY) === APP_PASSWORD)
const authModalOpen = ref(false)
const authPassword = ref('')
const authError = ref('')
const pendingAction = ref<(() => void) | null>(null)

function requireAuth(action: () => void) {
  if (isAuthenticated.value) {
    action()
  } else {
    pendingAction.value = action
    authModalOpen.value = true
    authPassword.value = ''
    authError.value = ''
  }
}

function submitAuth() {
  if (authPassword.value !== APP_PASSWORD) {
    authError.value = 'Wrong password.'
    return
  }
  localStorage.setItem(AUTH_KEY, APP_PASSWORD)
  isAuthenticated.value = true
  authModalOpen.value = false
  const action = pendingAction.value
  pendingAction.value = null
  action?.()
}

function cancelAuth() {
  authModalOpen.value = false
  pendingAction.value = null
  authPassword.value = ''
  authError.value = ''
}

function formatDate(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.result-pop {
  animation: result-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes result-pop {
  0% {
    opacity: 0;
    transform: scale(0.3);
  }

  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
