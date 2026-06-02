/**
 * useAdminUsers.ts
 *
 * Manages the full user list and admin CRUD operations for the Admin Dashboard.
 * Wraps GET /api/v1/users, POST /api/v1/users, PATCH /api/v1/users/{id},
 * and DELETE /api/v1/users/{id}.
 *
 * Fetches the user list on mount and exposes optimistic local state updates
 * after create, update, and delete operations so the UI reflects changes immediately.
 *
 * Intended for admin users only — non-admins will receive 403 from the API.
 */
import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/services/api-client';
import type { User } from '@/utils/types';

export interface CreateUserPayload {
  username: string;
  password: string;
  full_name?: string;
  email?: string;
  region?: string;
  role: string;
}

export interface UpdateUserPayload {
  full_name?: string;
  email?: string;
  region?: string;
  role?: string;
  is_active?: boolean;
}

export function useAdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch the full user list from GET /api/v1/users.
   * Called automatically on mount and available for manual refresh.
   */
  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<User[]>('/users');
      setUsers(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  /**
   * Create a new user via POST /api/v1/users.
   * Appends the created user to local state on success.
   *
   * @param payload - User fields to create.
   * @returns null on success, or an error message string on failure.
   */
  const createUser = useCallback(async (payload: CreateUserPayload): Promise<string | null> => {
    try {
      const newUser = await api.post<User>('/users', payload);
      setUsers((prev) => [...prev, newUser]);
      return null;
    } catch (err) {
      return err instanceof ApiError ? err.detail : 'Failed to create user.';
    }
  }, []);

  /**
   * Delete a user via DELETE /api/v1/users/{userId}.
   * Removes the user from local state on success.
   *
   * @param userId - The numeric user_id of the user to delete.
   * @throws ApiError if the request fails (e.g. 403 attempting to delete admin).
   */
  const deleteUser = useCallback(async (userId: number): Promise<void> => {
    await api.delete(`/users/${userId}`);
    setUsers((prev) => prev.filter((u) => u.user_id !== userId));
  }, []);

  /**
   * Update a user's role, active status, or profile fields via PATCH /api/v1/users/{userId}.
   * Replaces the user in local state with the server-returned updated record.
   *
   * @param userId  - The numeric user_id of the user to update.
   * @param payload - Fields to update (only provided fields are changed).
   * @throws ApiError if the request fails.
   */
  const updateUser = useCallback(async (userId: number, payload: UpdateUserPayload): Promise<void> => {
    const updated = await api.patch<User>(`/users/${userId}`, payload);
    setUsers((prev) => prev.map((u) => (u.user_id === userId ? updated : u)));
  }, []);

  return {
    users,
    loading,
    error,
    createUser,
    deleteUser,
    updateUser,
    reload: loadUsers,
  };
}
