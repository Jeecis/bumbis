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

    <main class="flex-grow container mx-auto px-4 sm:px-6 py-12 max-w-2xl pb-28">
      <div class="flex flex-wrap items-center justify-between gap-4 mb-10 px-2">
        <div>
          <p class="text-on-surface-variant uppercase font-black tracking-widest text-sm">
            Friday Food Forum
          </p>
          <h1 class="text-4xl font-black tracking-tight">Where are we eating?</h1>
        </div>
        <RouterLink
          to="/"
          class="bg-surface-container-high px-5 py-3 rounded-full text-sm font-extrabold uppercase tracking-wide text-on-surface hover:bg-surface-container-highest transition-colors"
        >
          Home
        </RouterLink>
      </div>

      <div
        class="bg-surface-container-low rounded-[2rem] p-8 text-center shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
      >
        <span class="material-symbols-outlined text-6xl text-primary">restaurant</span>
        <h2 class="text-2xl font-black tracking-tight mt-4">Start a vote</h2>
        <p class="text-on-surface-variant mt-2 mb-6">
          Create a forum, share the link, and let everyone vote on lunch. Comes loaded with the
          usual spots — add your own, set a timer, and spin to break ties.
        </p>
        <button
          type="button"
          class="pressurized-gradient-primary rounded-full px-8 py-4 text-white font-extrabold uppercase tracking-wide hover:brightness-110 transition-all disabled:opacity-60"
          :disabled="creating"
          @click="start"
        >
          {{ creating ? 'Creating…' : 'Create a forum' }}
        </button>
        <p v-if="errorMsg" class="text-secondary text-sm font-bold mt-4">{{ errorMsg }}</p>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { createForum } from '@/utils/foodForum'
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

const router = useRouter()
const creating = ref(false)
const errorMsg = ref('')

async function start() {
  if (creating.value) return
  creating.value = true
  errorMsg.value = ''
  try {
    const { id, adminToken } = await createForum()
    // Remember we own this forum so the session page shows the admin controls.
    localStorage.setItem(`forumAdmin:${id}`, adminToken)
    router.push(`/food-forum/${id}`)
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : 'Could not create the forum'
    creating.value = false
  }
}
</script>
