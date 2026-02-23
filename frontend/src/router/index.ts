import { createRouter, createWebHistory, type RouteLocationNormalized } from 'vue-router'
import LoginView from '../views/auth/LoginView'
import RegisterView from '../views/auth/RegisterView'
import AppLayout from '../components/AppLayout'
import AdminLayout from '../components/AdminLayout'
import HomeView from '../views/home/HomeView'
import OverviewContent from '../views/home/OverviewContent'
import ProviderListView from '../views/provider/ProviderListView'
import ProviderModelsView from '../views/provider/ProviderModelsView'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', name: 'Login', component: LoginView },
    { path: '/register', name: 'Register', component: RegisterView },
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', redirect: { name: 'Home' } },
        {
          path: 'home',
          component: HomeView,
          meta: {
            tabs: [{ label: 'Overview', to: '/home' }],
          },
          children: [{ path: '', name: 'Home', component: OverviewContent }],
        },
        {
          path: 'admin',
          component: AdminLayout,
          children: [
            { path: '', redirect: { name: 'AdminProviderManagement' } },
            { path: 'providers', name: 'AdminProviderManagement', component: ProviderListView },
            {
              path: 'providers/:id/models',
              name: 'AdminProviderModelManagement',
              component: ProviderModelsView,
            },
          ],
        },
      ],
    },
  ],
})

// 路由守卫
router.beforeEach((to: RouteLocationNormalized) => {
  const token = localStorage.getItem('access_token')
  // to.path 只包含 URL 的路径部分，不含域名、查询参数、哈希。
  const isPublic = to.name === 'Login' || to.name === 'Register'

  // 如果未登录（没有access 访问令牌）且不是public路由则要先登陆
  if (!token && !isPublic) {
    return { name: 'Login' }
  }

  // 如果已登录（有access 访问令牌）且是public路由则要重定向到home
  if (token && isPublic) {
    return { name: 'Home' }
  }
})

export default router
