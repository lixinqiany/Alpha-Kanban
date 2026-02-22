import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/auth/LoginView'
import RegisterView from '../views/auth/RegisterView'
import ProviderListView from '../views/provider/ProviderListView'
import ProviderModelsView from '../views/provider/ProviderModelsView'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView },
    { path: '/register', component: RegisterView },
    { path: '/providers', component: ProviderListView },
    { path: '/providers/:id/models', component: ProviderModelsView },
    { path: '/', redirect: '/login' },
  ],
})

export default router
