import { useState } from 'react';
import axios from 'axios';
import ThemeSwitch from './ThemeSwitch';

interface AuthFormProps {
  onLogin: (user: { id: string; name: string; email: string }, token: string) => void;
  theme: string;
  setTheme: (theme: string) => void;
}

export default function AuthForm({ onLogin, theme, setTheme }: AuthFormProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [id, setId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        const res = await axios.post('/api/register', { name, id, email, password });
        setMode('login');
        setError('Registration successful! Please log in.');
      } else {
        const res = await axios.post('/api/login', { id, email, password });
        localStorage.setItem('token', res.data.token);
        onLogin(res.data.user, res.data.token);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
      <div className="absolute top-4 right-4 z-10">
        <ThemeSwitch theme={theme} setTheme={setTheme} />
      </div>
      <div className="max-w-xs w-full mx-auto bg-white dark:bg-gray-900 p-6 rounded shadow flex flex-col gap-4">
        <h2 className="text-xl font-semibold text-center mb-2 text-gray-900 dark:text-gray-100">
          {mode === 'login' ? 'Login' : 'Register'}
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {mode === 'register' && (
            <input
              className="border px-3 py-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          )}
          <input
            className="border px-3 py-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
            placeholder="Username (id)"
            value={id}
            onChange={e => setId(e.target.value)}
            required
          />
          <input
            className="border px-3 py-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
            placeholder="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required={mode === 'register'}
          />
          <input
            className="border px-3 py-2 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-700"
            placeholder="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
          <button
            className="bg-blue-500 text-white py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}
          </button>
        </form>
        <div className="text-sm text-center text-gray-700 dark:text-gray-300">
          {mode === 'login' ? (
            <>
              Don&apos;t have an account?{' '}
              <button className="text-blue-600 hover:underline" onClick={() => setMode('register')}>
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button className="text-blue-600 hover:underline" onClick={() => setMode('login')}>
                Login
              </button>
            </>
          )}
        </div>
        {error && <div className="text-red-500 text-sm text-center">{error}</div>}
      </div>
    </div>
  );
} 