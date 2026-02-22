import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/auth/LoginView'
import RegisterView from '../views/auth/RegisterView'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView },
    { path: '/register', component: RegisterView },
    { path: '/', redirect: '/login' },
  ],
})

export default router
