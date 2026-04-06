'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FileText, Check, Circle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';

export default function SignupPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await signup(name, email, password, confirmPassword);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 bg-gradient-to-b from-background to-orange-50/30">
      <motion.div
        className="w-full max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Link
          href="/"
          className="flex items-center gap-3 justify-center mb-8 hover:opacity-90"
        >
          <div className="gradient-primary p-2.5 rounded-xl shadow-lg">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900">
            MyDream<span className="gradient-text">Resume</span>
          </span>
        </Link>

        <div className="glass-card rounded-2xl p-8 border border-orange-200/30 shadow-xl">
          <h1 className="text-2xl font-bold text-foreground mb-2">Create account</h1>
          <p className="text-muted-foreground mb-6">
            Sign up to save and manage your resumes.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative mt-1">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-2 space-y-1.5">
                {[
                  { label: 'At least 8 characters', met: password.length >= 8 },
                  { label: 'One uppercase letter', met: /[A-Z]/.test(password) },
                  { label: 'One lowercase letter', met: /[a-z]/.test(password) },
                  { label: 'One number', met: /[0-9]/.test(password) },
                  { label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
                ].map((rule) => (
                  <div
                    key={rule.label}
                    className={`flex items-center gap-2 text-xs ${
                      rule.met ? 'text-green-600' : 'text-muted-foreground'
                    }`}
                  >
                    {rule.met ? (
                      <Check className="h-3.5 w-3.5 shrink-0" />
                    ) : (
                      <Circle className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    )}
                    <span>{rule.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <Button
              type="submit"
              className="w-full gradient-primary text-white font-semibold py-6"
              disabled={loading}
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
