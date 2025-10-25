// 引入 NextAuth 用于实现中间件身份认证
import NextAuth from 'next-auth';
// 引入自定义的认证配置
import { authConfig } from './auth.config';
 
// 导出 NextAuth 中间件 auth 方法，作为中间件主体函数
export default NextAuth(authConfig).auth;
 
// 配置中间件的生效范围和运行环境
export const config = {
  // 匹配除 api、_next/static、_next/image 以及 png 文件外的所有路由
  // 参考官方文档：https://nextjs.org/docs/app/building-your-application/routing/middleware#matcher
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
  // 指定运行在 nodejs 环境下
  runtime: 'nodejs',
};