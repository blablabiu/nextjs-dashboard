import type { NextAuthConfig } from 'next-auth';
 
export const authConfig = {
  // 自定义登录页面路径
  pages: {
    signIn: '/login',
  },
  callbacks: {
    // 自定义 authorized 回调函数，用于控制访问权限逻辑
    authorized({ auth, request: { nextUrl } }) {
      // 判断当前用户是否已登录
      const isLoggedIn = !!auth?.user;
      // 判断当前路径是否为 dashboard 相关页面
      const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
      if (isOnDashboard) {
        if (isLoggedIn) return true; // 已登录允许访问 dashboard
        return false; // 未登录则拦截跳转到登录
      } else if (isLoggedIn) {
        // 如果已登录且在非 dashboard 页面，重定向到 /dashboard
        return Response.redirect(new URL('/dashboard', nextUrl));
      }
      return true; // 其他情况默认允许
    },
  },
  providers: [], // 目前未添加任何 provider
} satisfies NextAuthConfig;