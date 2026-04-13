import { userFacingStaffListErrorMessage } from '../api/client.js';

/**
 * @param {Response} res
 * @param {unknown} data
 * @param {unknown} [networkErr]
 * @returns {{ category: string; message: string } | null}
 */
export function classifyStaffListFailure(res, data, networkErr) {
  if (networkErr != null) {
    return {
      category: 'network error',
      message: 'Network or timeout — could not load the list.',
    };
  }
  if (!res) {
    return {
      category: 'empty response',
      message: 'No response from server.',
    };
  }
  if (res.status === 401) {
    return { category: 'auth error', message: 'Session expired. Please sign in again.' };
  }
  if (res.status === 403) {
    return { category: 'permission error', message: 'You do not have permission to load this list.' };
  }
  if (res.status === 408 || res.status === 504) {
    return { category: 'timeout', message: 'Server timed out. Try again shortly.' };
  }
  if (!res.ok) {
    return {
      category: 'upstream error',
      message: userFacingStaffListErrorMessage(data),
    };
  }
  return null;
}
