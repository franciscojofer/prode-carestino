// File: frontend/src/screens/RegisterScreen.tsx
// Purpose: User self-registration screen.
// Functionality: Six-field form (nombre, apellido, cuil, email, password,
// passwordConfirm) validated client-side with the same rules the backend
// applies. On success the cookie set by the backend automatically logs
// the user in and they are redirected to /torneo.
// Role: Public route `/register`.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { Field } from '../components/Field';
import { Button } from '../components/Button';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../lib/apiClient';
import { registerSchema, type RegisterFormValues } from '../schemas/auth';

// Same idea as in LoginScreen: backend field-scoped errors get folded
// back into the form, anything else surfaces as a banner.
const FIELD_KEYS: ReadonlyArray<keyof RegisterFormValues> = [
  'nombre',
  'apellido',
  'cuil',
  'email',
  'password',
  'passwordConfirm',
];

export function RegisterScreen() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      cuil: '',
      email: '',
      password: '',
      passwordConfirm: '',
    },
  });

  if (user) return <Navigate to="/torneo" replace />;

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await register.mutateAsync(values);
      navigate('/torneo', { replace: true });
    } catch (e) {
      if (
        e instanceof ApiError &&
        e.field &&
        (FIELD_KEYS as readonly string[]).includes(e.field)
      ) {
        form.setError(e.field as keyof RegisterFormValues, { message: e.message });
      } else if (e instanceof ApiError) {
        setServerError(e.message);
      } else {
        setServerError('No pudimos crear la cuenta. Reintentá en un momento.');
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Header title="Crear cuenta" showBack onBack={() => navigate('/login')} />

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex-1 px-5 py-6 overflow-y-auto"
        noValidate
      >
        <div className="flex flex-col gap-3.5">
          <Field
            label="Nombre"
            placeholder="Martín"
            autoComplete="given-name"
            error={form.formState.errors.nombre?.message}
            {...form.register('nombre')}
          />
          <Field
            label="Apellido"
            placeholder="García"
            autoComplete="family-name"
            error={form.formState.errors.apellido?.message}
            {...form.register('apellido')}
          />
          <Field
            label="CUIL"
            placeholder="20-35123456-9"
            inputMode="numeric"
            error={form.formState.errors.cuil?.message}
            {...form.register('cuil')}
          />
          <Field
            label="Email"
            type="email"
            placeholder="tu.email@carestino.com"
            autoComplete="email"
            helper="Usarás este email para ingresar."
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <Field
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <Field
            label="Repetir contraseña"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={form.formState.errors.passwordConfirm?.message}
            {...form.register('passwordConfirm')}
          />

          {serverError && (
            <div
              className="rounded-lg border border-danger bg-danger/5 px-3 py-2 text-xs font-semibold text-danger"
              role="alert"
            >
              {serverError}
            </div>
          )}

          <div className="mt-3">
            <Button type="submit" fullWidth disabled={register.isPending}>
              {register.isPending ? 'CREANDO…' : 'CREAR CUENTA'}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-sm text-center font-semibold text-brand-navy"
          >
            Volver a ingresar
          </button>
        </div>
      </form>
    </div>
  );
}
