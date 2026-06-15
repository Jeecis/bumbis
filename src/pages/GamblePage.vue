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

    <main class="flex-grow container mx-auto px-4 sm:px-6 py-4 max-w-3xl">
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

      <!-- Maintenance notice -->
      <div
        class="bg-surface-container-low rounded-[2rem] p-10 text-center shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
      >
        <span class="material-symbols-outlined text-7xl text-outline-variant">construction</span>
        <h2 class="mt-4 text-2xl font-black tracking-tight">Under Maintenance</h2>
        <p class="mt-3 text-on-surface-variant font-bold max-w-md mx-auto">
          ELO gambling is temporarily disabled while we sort things out. Ratings are unaffected —
          your ELO is exactly what you earned on the pitch.
        </p>
        <RouterLink
          to="/results?tab=rankings"
          class="inline-block mt-7 bg-primary text-on-primary px-7 py-3 rounded-full text-sm font-extrabold uppercase tracking-wide hover:opacity-90 transition-opacity"
        >
          Back to Rankings
        </RouterLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
