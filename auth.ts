// 引入 next-auth 和 credentials provider
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
// 引入认证配置
import { authConfig } from './auth.config';
// 引入 zod 用于参数校验
import { z } from 'zod';
// 导入用户类型定义
import type { User } from '@/app/lib/definitions';
// 引入 bcrypt 用于密码对比
import bcrypt from 'bcrypt';
// 引入 postgres 用于数据库操作
import postgres from 'postgres';

// 创建 sql 客户端连接
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// 根据邮箱获取用户信息
async function getUser(email: string): Promise<User | undefined> {
  try {
    // 查询数据库获取用户
    const user = await sql<User[]>`SELECT * FROM users WHERE email=${email}`;
    return user[0]; // 返回第一个查询结果
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

// 导出 auth、signIn、signOut 方法
export const { auth, signIn, signOut } = NextAuth({
  ...authConfig, // 合并认证配置
  providers: [
    // 使用 Credentials Provider 进行用户名密码登录
    Credentials({
      async authorize(credentials) {
        // 校验输入的 credentials
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        // 如果校验通过
        if (parsedCredentials.success) {
          const { email, password } = parsedCredentials.data;
          // 获取用户信息
          const user = await getUser(email);
          if (!user) return null;
          // TODO: 可在此处加入密码校验逻辑, 如：await bcrypt.compare(password, user.password)
          const passwordsMatch = await bcrypt.compare(password, user.password);
          if (passwordsMatch) return user;
        }

        // 校验失败或用户不存在时返回 null
        return null;
      },
    }),
  ],
});