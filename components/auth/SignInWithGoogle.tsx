import { createClient } from '@/lib/supabase/client'

export default function SignInWithGoogle() {
  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? window.location.origin + '/auth/callback' : undefined,
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-black bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all shadow"
    >
      <img src="https://www.svgrepo.com/show/355037/google.svg" alt="Google" width={20} height={20} />
      Sign in with Google
    </button>
  );
}
