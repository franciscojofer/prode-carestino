// File: frontend/src/screens/LoginScreen.tsx
// Purpose: Login screen.
// Functionality: Renders the orange splash from the mockup plus a
// react-hook-form controlled form. Submits to `useAuth().login`; backend
// validation errors with a `field` are mapped into form errors, the rest
// surface as a banner. Already-logged users land on /torneo immediately.
// Role: Public route `/login`.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { Field } from '../components/Field';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/apiClient';
import { loginSchema, type LoginFormValues } from '../schemas/auth';

// WhatsApp support contact rendered below the form. Centralised so the
// number can be updated in a single place.
const SUPPORT_WHATSAPP_URL = 'https://wa.me/5491122887777';

// Fields whose error messages we want to map back into the form. Anything
// else from the backend (`UNAUTHORIZED`, `TOO_MANY_REQUESTS`) becomes a
// banner above the submit button.
const FIELD_KEYS: ReadonlyArray<keyof LoginFormValues> = ['email', 'password'];

export function LoginScreen() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // After-login destination: either the place the user wanted to reach
  // before being redirected to /login, or the home tab.
  const fromState = location.state as { from?: { pathname: string } } | null;
  const from = fromState?.from?.pathname ?? '/torneo';

  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Logged-in users have no business here.
  if (user) return <Navigate to={from} replace />;

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await login.mutateAsync(values);
      navigate(from, { replace: true });
    } catch (e) {
      if (e instanceof ApiError && e.field && (FIELD_KEYS as readonly string[]).includes(e.field)) {
        form.setError(e.field as keyof LoginFormValues, { message: e.message });
      } else if (e instanceof ApiError) {
        setServerError(e.message);
      } else {
        setServerError('No pudimos procesar tu solicitud. Reintentá en un momento.');
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <div className="pt-12 pb-10 px-6 flex flex-col items-center bg-brand-orange text-white">
        <Logo size={56} />
        <div className="mt-3 text-[10px] tracking-[0.22em] opacity-90 font-semibold">
          PRODE CARESTINO
        </div>
        <div className="mt-1 text-2xl font-extrabold tracking-tight">Mundial 2026</div>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex-1 px-6 py-8 flex flex-col gap-4"
        noValidate
      >
        <Field
          label="Email"
          type="email"
          placeholder="tu.email@carestino.com"
          autoComplete="username"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <Field
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />

        {serverError && (
          <div
            className="rounded-lg border border-danger bg-danger/5 px-3 py-2 text-xs font-semibold text-danger"
            role="alert"
          >
            {serverError}
          </div>
        )}

        <div className="mt-2">
          <Button type="submit" fullWidth disabled={login.isPending}>
            {login.isPending ? 'INGRESANDO…' : 'INGRESAR'}
          </Button>
        </div>


        <a
          href={SUPPORT_WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-center font-semibold text-brand-orange"
        >
          Si necesitas ayuda, hace click y contactanos por WhatsApp.
        </a>
      </form>

      <div className="px-6 py-4 text-center text-[10px] tracking-wider text-muted">
        CARESTINO · BEBÉS FELICES
      </div>
    </div>
  );
}
