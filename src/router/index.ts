import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/HomePage.vue'),
    meta: { layout: 'BlankLayout', title: 'BUMBIS' },
  },
  {
    path: '/wheel',
    name: 'WheelLocal',
    component: () => import('@/pages/WheelLocalPage.vue'),
    meta: { layout: 'BlankLayout', title: 'BUMBIS | Wheel' },
  },
  {
    path: '/wheel/:wheelId',
    name: 'Wheel',
    component: () => import('@/pages/WheelPage.vue'),
    meta: { layout: 'BlankLayout', title: 'BUMBIS | Shared Wheel' },
  },
  {
    path: '/match/:roomId',
    name: 'Matchmaking',
    component: () => import('@/pages/MatchmakingPage.vue'),
    meta: { layout: 'BlankLayout', title: 'BUMBIS | Matchmaking' },
  },
  {
    path: '/results',
    name: 'Results',
    component: () => import('@/pages/ResultsPage.vue'),
    meta: { layout: 'BlankLayout', title: 'BUMBIS | Results' },
  },
  {
    path: '/facts',
    name: 'FunFacts',
    component: () => import('@/pages/FunFactsPage.vue'),
    meta: { layout: 'BlankLayout', title: 'BUMBIS | Fun Facts' },
  },
  {
    path: '/gamble',
    name: 'Gamble',
    component: () => import('@/pages/GamblePage.vue'),
    meta: { layout: 'BlankLayout', title: 'BUMBIS | Gamble' },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
] as RouteRecordRaw[]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  document.title = to.meta?.title?.toString() ?? 'new_project'
})

export default router
