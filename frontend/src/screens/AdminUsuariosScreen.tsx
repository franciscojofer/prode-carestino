// File: frontend/src/screens/AdminUsuariosScreen.tsx
// Purpose: Admin panel for user management.
// Functionality: Lists every user (active and inactive), exposes inline
// admin toggle and delete buttons, and opens a modal for creating or
// editing a user. Server errors with a `field` are folded back into the
// form; everything else surfaces as a banner.
// Role: Bound to /admin/usuarios behind AdminRoute.

import { useState } from 'react';
import { useForm, type DefaultValues, type UseFormReturn, type FieldPath, type FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Field } from '../components/Field';
import { Toggle } from '../components/Toggle';
import { Modal } from '../components/Modal';
import { SegmentedControl } from '../components/SegmentedControl';
import { Header } from '../components/Header';
import { TabBar } from '../components/TabBar';
import {
  useAdminUsers,
  useCreateAdminUser,
  useUpdateAdminUser,
  useDeactivateAdminUser,
  type AdminUserRow,
} from '../hooks/useAdmin';
import { useAuth } from '../hooks/useAuth';
import {
  adminCreateUserSchema,
  adminEditUserSchema,
  type AdminCreateUserValues,
  type AdminEditUserValues,
} from '../schemas/admin';
import { ApiError } from '../lib/apiClient';

// Helper kept local: builds two-letter initials from "Nombre Apellido".
function initials(u: { nombre: string; apellido: string }) {
  return `${u.nombre[0] ?? ''}${u.apellido[0] ?? ''}`.toUpperCase();
}

export function AdminUsuariosScreen() {
  const navigate = useNavigate();
  const { user: me } = useAuth();
  const users = useAdminUsers();
  const update = useUpdateAdminUser();
  const deactivate = useDeactivateAdminUser();

  // Tracks the modal mode. `null` = closed, `'create'` = new user form,
  // `{ user }` = edit form for that row.
  const [modal, setModal] = useState<null | { kind: 'create' } | { kind: 'edit'; user: AdminUserRow }>(
    null,
  );

  const data = users.data ?? [];

  return (
    <div className="flex flex-col min-h-screen bg-surface-alt">
      <Header title="Panel Admin" showBack onBack={() => navigate('/mas')} adminBadge />

      <div className="px-4 pt-3 pb-2">
        <SegmentedControl
          value="users"
          onChange={(v) => v === 'results' && navigate('/admin/resultados')}
          options={[
            {
              value: 'users',
              label: (
                <>
                  <Users size={14} className="inline mr-1.5 -mt-0.5" />
                  USUARIOS
                </>
              ),
            },
            {
              value: 'results',
              label: (
                <>
                  <ClipboardList size={14} className="inline mr-1.5 -mt-0.5" />
                  RESULTADOS
                </>
              ),
            },
          ]}
        />
      </div>

      <div className="px-4 mb-2 mt-2 flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-wider text-muted">
          {data.length} USUARIOS
        </span>
        <Button size="sm" onClick={() => setModal({ kind: 'create' })}>
          <Plus size={14} className="inline -mt-0.5 mr-1" />
          NUEVO
        </Button>
      </div>

      <main className="flex-1 overflow-y-auto px-4 pb-4">
        {users.isLoading ? (
          <Card>
            <div className="px-4 py-8 text-center text-sm text-muted">Cargando…</div>
          </Card>
        ) : data.length === 0 ? (
          <Card>
            <div className="px-4 py-8 text-center text-sm text-muted">No hay usuarios.</div>
          </Card>
        ) : (
          <Card>
            {data.map((u, i) => (
              <UserRow
                key={u.id}
                user={u}
                isFirst={i === 0}
                isMe={me?.id === u.id}
                onAdminToggle={(next) =>
                  update.mutate({ id: u.id, isAdmin: next })
                }
                onEdit={() => setModal({ kind: 'edit', user: u })}
                onDelete={() => {
                  if (
                    confirm(`¿Eliminar a ${u.nombre} ${u.apellido}? La cuenta queda inactiva.`)
                  ) {
                    deactivate.mutate(u.id);
                  }
                }}
              />
            ))}
          </Card>
        )}
      </main>

      <TabBar />

      {modal?.kind === 'create' && (
        <CreateUserModal onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'edit' && (
        <EditUserModal user={modal.user} onClose={() => setModal(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// User row
// ---------------------------------------------------------------------------

type UserRowProps = {
  user: AdminUserRow;
  isFirst: boolean;
  isMe: boolean;
  onAdminToggle: (next: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
};

function UserRow({ user, isFirst, isMe, onAdminToggle, onEdit, onDelete }: UserRowProps) {
  return (
    <div className={`px-3 py-3 ${isFirst ? '' : 'border-t'}`}>
      <div className="flex items-start gap-3">
        <div className="rounded-full w-9 h-9 flex items-center justify-center text-xs font-bold shrink-0 bg-brand-orange-soft text-brand-orange">
          {initials(user)}
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`text-sm font-bold truncate ${user.isActive ? 'text-ink' : 'text-muted line-through'}`}
          >
            {user.nombre} {user.apellido}
          </div>
          <div className="text-[11px] truncate text-muted">{user.email}</div>
          <div className="text-[11px] text-muted">CUIL: {user.cuil}</div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="p-1.5 rounded-md text-brand-navy"
              aria-label="Editar usuario"
            >
              <Pencil size={14} />
            </button>
            {!isMe && user.isActive && (
              <button
                type="button"
                onClick={onDelete}
                className="p-1.5 rounded-md text-danger"
                aria-label="Eliminar usuario"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold tracking-wider text-muted">ADMIN</span>
            <Toggle
              checked={user.isAdmin}
              disabled={isMe}
              onChange={onAdminToggle}
              label="Es administrador"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create user modal
// ---------------------------------------------------------------------------

function CreateUserModal({ onClose }: { onClose: () => void }) {
  const mutate = useCreateAdminUser();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<AdminCreateUserValues>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      cuil: '',
      email: '',
      password: '',
      isAdmin: false,
    },
  });

  const onSubmit = async (values: AdminCreateUserValues) => {
    setServerError(null);
    try {
      await mutate.mutateAsync(values);
      onClose();
    } catch (e) {
      handleSubmitError(e, form, setServerError);
    }
  };

  return (
    <Modal open onClose={onClose} title="Nuevo usuario">
      <form className="flex flex-col gap-3.5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Field
          label="Nombre"
          placeholder="Martín"
          error={form.formState.errors.nombre?.message}
          {...form.register('nombre')}
        />
        <Field
          label="Apellido"
          placeholder="García"
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
          placeholder="usuario@carestino.com"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <Field
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />
        <label className="flex items-center justify-between py-1">
          <span className="text-[11px] font-bold tracking-wider uppercase text-brand-navy">
            Es administrador
          </span>
          <Toggle
            checked={form.watch('isAdmin') ?? false}
            onChange={(v) => form.setValue('isAdmin', v, { shouldDirty: true })}
            label="Es administrador"
          />
        </label>

        {serverError && (
          <div className="rounded-lg border border-danger bg-danger/5 px-3 py-2 text-xs font-semibold text-danger">
            {serverError}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} fullWidth>
            CANCELAR
          </Button>
          <Button type="submit" fullWidth disabled={mutate.isPending}>
            {mutate.isPending ? 'CREANDO…' : 'CREAR'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Edit user modal
// ---------------------------------------------------------------------------

function EditUserModal({ user, onClose }: { user: AdminUserRow; onClose: () => void }) {
  const mutate = useUpdateAdminUser();
  const [serverError, setServerError] = useState<string | null>(null);

  const defaults: DefaultValues<AdminEditUserValues> = {
    nombre: user.nombre,
    apellido: user.apellido,
    cuil: user.cuil,
    email: user.email,
    password: '',
    isAdmin: user.isAdmin,
    isActive: user.isActive,
  };

  const form = useForm<AdminEditUserValues>({
    resolver: zodResolver(adminEditUserSchema),
    defaultValues: defaults,
  });

  const onSubmit = async (values: AdminEditUserValues) => {
    setServerError(null);
    // Only send fields the admin actually changed. Empty password means
    // "leave it alone".
    const payload: AdminEditUserValues = {};
    if (values.nombre !== user.nombre) payload.nombre = values.nombre;
    if (values.apellido !== user.apellido) payload.apellido = values.apellido;
    if (values.cuil !== user.cuil) payload.cuil = values.cuil;
    if (values.email !== user.email) payload.email = values.email;
    if (values.password && values.password.length > 0) payload.password = values.password;
    if (values.isAdmin !== user.isAdmin) payload.isAdmin = values.isAdmin;
    if (values.isActive !== user.isActive) payload.isActive = values.isActive;

    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    try {
      await mutate.mutateAsync({ id: user.id, ...payload });
      onClose();
    } catch (e) {
      handleSubmitError(e, form, setServerError);
    }
  };

  return (
    <Modal open onClose={onClose} title={`Editar ${user.nombre} ${user.apellido}`}>
      <form className="flex flex-col gap-3.5" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        <Field
          label="Nombre"
          error={form.formState.errors.nombre?.message}
          {...form.register('nombre')}
        />
        <Field
          label="Apellido"
          error={form.formState.errors.apellido?.message}
          {...form.register('apellido')}
        />
        <Field
          label="CUIL"
          inputMode="numeric"
          error={form.formState.errors.cuil?.message}
          {...form.register('cuil')}
        />
        <Field
          label="Email"
          type="email"
          error={form.formState.errors.email?.message}
          {...form.register('email')}
        />
        <Field
          label="Nueva contraseña"
          type="password"
          placeholder="(dejar vacío para no cambiar)"
          helper="Sólo completar si querés resetear la contraseña."
          error={form.formState.errors.password?.message}
          {...form.register('password')}
        />

        <label className="flex items-center justify-between py-1">
          <span className="text-[11px] font-bold tracking-wider uppercase text-brand-navy">
            Es administrador
          </span>
          <Toggle
            checked={form.watch('isAdmin') ?? false}
            onChange={(v) => form.setValue('isAdmin', v, { shouldDirty: true })}
            label="Es administrador"
          />
        </label>

        <label className="flex items-center justify-between py-1">
          <span className="text-[11px] font-bold tracking-wider uppercase text-brand-navy">
            Activo
          </span>
          <Toggle
            checked={form.watch('isActive') ?? true}
            onChange={(v) => form.setValue('isActive', v, { shouldDirty: true })}
            label="Cuenta activa"
          />
        </label>

        {serverError && (
          <div className="rounded-lg border border-danger bg-danger/5 px-3 py-2 text-xs font-semibold text-danger">
            {serverError}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} fullWidth>
            CANCELAR
          </Button>
          <Button type="submit" fullWidth disabled={mutate.isPending}>
            {mutate.isPending ? 'GUARDANDO…' : 'GUARDAR'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Shared submit error handler
// ---------------------------------------------------------------------------

// Maps a thrown error to either a field-scoped error (when the backend
// returned `field`) or the generic server error banner. Generic over the
// form's value type so the field name flows through TypeScript.
function handleSubmitError<T extends FieldValues>(
  e: unknown,
  form: UseFormReturn<T>,
  setServerError: (msg: string) => void,
) {
  if (e instanceof ApiError && e.field) {
    // The field name comes from the backend so we have to assert; if the
    // server sends an unknown field we still surface the message safely.
    form.setError(e.field as FieldPath<T>, { message: e.message });
    return;
  }
  if (e instanceof ApiError) {
    setServerError(e.message);
    return;
  }
  setServerError('No pudimos completar la operación. Reintentá en un momento.');
}
