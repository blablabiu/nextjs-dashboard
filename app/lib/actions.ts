'use server';

// 引入所需模块
import postgres from 'postgres';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { signIn } from '@/auth';
import { AuthError } from 'next-auth';

// 初始化 postgres 客户端
const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

/**
 * 登录认证方法
 * @param prevState 前一个状态
 * @param formData 表单数据
 * @returns 认证结果信息
 */
export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
  ) {
    try {
      // 调用 signIn 进行登录
      await signIn('credentials', formData);
    } catch (error) {
      // 处理 next-auth 抛出的认证错误
      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return 'Invalid credentials.'; // 认证失败提示
          default:
            return 'Something went wrong.'; // 其他认证错误
        }
      }
      throw error; // 未知错误向上抛出
    }
  }

// 定义发票表单校验 schema
const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
      invalid_type_error: 'Please select a customer.', // 客户校验信息
    }),
    amount: z.coerce
      .number()
      .gt(0, { message: 'Please enter an amount greater than $0.' }), // 金额必须大于0
    status: z.enum(['pending', 'paid'], {
      invalid_type_error: 'Please select an invoice status.', // 状态校验信息
    }),
    date: z.string(),
  });

// CreateInvoice 只包含新建发票所需的字段（排除 id 和 date）
const CreateInvoice = FormSchema.omit({ id: true, date: true });

// UpdateInvoice 包含可更新的字段（排除 id 和 date）
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

/**
 * State 类型定义：错误信息、消息等
 */
export type State = {
    errors?: {
      customerId?: string[];
      amount?: string[];
      status?: string[];
    };
    message?: string | null;
  };
 
/**
 * 创建发票方法
 * @param prevState 前一状态
 * @param formData 表单数据
 * @returns 错误信息或直接重定向
 */
export async function createInvoice(prevState: State, formData: FormData) {
    // 使用 Zod 校验表单
    const validatedFields = CreateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
   
    // 表单校验失败，返回错误信息
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
      };
    }
   
    // 构造插入数据库的数据
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100; // 转为分
    const date = new Date().toISOString().split('T')[0]; // 获取当天日期字符串（YYYY-MM-DD）
   
    // 写入数据库
    try {
      await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      `;
    } catch (error) {
      // 捕捉数据库错误
      return {
        message: 'Database Error: Failed to Create Invoice.',
      };
    }
   
    // 校验通过后刷新缓存并重定向
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  }

 /**
  * 更新发票方法
  * @param id 发票ID
  * @param prevState 前一状态
  * @param formData 表单数据
  * @returns 错误信息或重定向
  */
export async function updateInvoice(
    id: string,
    prevState: State,
    formData: FormData,
  ) {
    // 校验表单数据
    const validatedFields = UpdateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
   
    // 校验未通过，返回错误和提示
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Update Invoice.',
      };
    }
   
    // 提取表单字段
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
   
    // 更新数据库中的发票
    try {
      await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
        WHERE id = ${id}
      `;
    } catch (error) {
      return { message: 'Database Error: Failed to Update Invoice.' };
    }
   
    // 刷新缓存并重定向
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  }


/**
 * 删除发票方法
 * @param id 发票ID
 */
export async function deleteInvoice(id: string) {
    // 删除数据库中的发票
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    // 刷新缓存并重定向
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
  }