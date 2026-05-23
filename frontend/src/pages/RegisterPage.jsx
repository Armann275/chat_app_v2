import RegisterForm from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-900">
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-800">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Create your account
        </h1>
        <RegisterForm />
      </div>
    </main>
  );
}
