import { LoginForm } from './login-form';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="min-h-screen grid place-items-center bg-[#FFF5F5] p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 h-14 w-14 rounded-2xl bg-[#E60C10] grid place-items-center text-white text-2xl font-black">K</div>
          <h1 className="text-2xl font-bold">Keanita Admin</h1>
          <p className="text-sm text-muted-foreground">Σύνδεση προσωπικού</p>
        </div>
        <LoginForm initialError={error === 'not-staff' ? 'Ο λογαριασμός σου δεν έχει πρόσβαση στο dashboard.' : undefined} />
      </div>
    </main>
  );
}
