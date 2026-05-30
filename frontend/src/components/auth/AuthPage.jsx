// src/components/auth/AuthPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

export default function AuthPage() {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuthStore();
  const navigate = useNavigate();

  const [loginForm, setLoginForm] = useState({ identifier: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    orgName: '', adminName: '', adminEmail: '', password: '',
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginForm.identifier, loginForm.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register(registerForm);
      toast.success(`Organization created! Your ID: ${data.orgId}`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-purple-50 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-200 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-300 rounded-full opacity-20 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-card-hover border border-gray-100 p-8">
          {/* Logo */}
          <div className="text-center mb-7">
            <div className="w-14 h-14 bg-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-white font-heading font-bold text-2xl">O</span>
            </div>
            <h1 className="font-heading font-bold text-2xl text-gray-900">
              OrgDoc <span className="text-purple-500">AI</span>
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Centralized documentation for organizations
            </p>
          </div>

          {/* Tabs */}
          <div className="flex bg-gray-50 rounded-xl p-1 mb-6">
            {['login', 'register'].map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                  tab === t
                    ? 'bg-white text-purple-600 shadow-sm'
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab === 'login' ? (
              <motion.form
                key="login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleLogin}
                className="space-y-4"
              >
                <div>
                  <label className="label">Organization Name or ID</label>
                  <input
                    className="input"
                    placeholder="e.g. Tech Club or TC-1234"
                    value={loginForm.identifier}
                    onChange={(e) => setLoginForm({ ...loginForm, identifier: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Enter password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-base mt-2"
                >
                  {loading ? 'Signing in...' : 'Sign In →'}
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleRegister}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Organization Name</label>
                    <input
                      className="input"
                      placeholder="e.g. Tech Club"
                      value={registerForm.orgName}
                      onChange={(e) => setRegisterForm({ ...registerForm, orgName: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="label">Admin Name</label>
                    <input
                      className="input"
                      placeholder="John Doe"
                      value={registerForm.adminName}
                      onChange={(e) => setRegisterForm({ ...registerForm, adminName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Admin Email</label>
                  <input
                    className="input"
                    type="email"
                    placeholder="admin@club.com"
                    value={registerForm.adminEmail}
                    onChange={(e) => setRegisterForm({ ...registerForm, adminEmail: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Password</label>
                  <input
                    className="input"
                    type="password"
                    placeholder="Min 8 characters"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    required minLength={8}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 text-base mt-2"
                >
                  {loading ? 'Creating...' : 'Create Organization →'}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          <p className="text-center text-xs text-gray-400 mt-5">
            JWT authenticated · Role-based access control
          </p>
        </div>
      </motion.div>
    </div>
  );
}
