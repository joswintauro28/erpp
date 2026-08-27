import { toastError, errorMessage } from "../utils/toast";

/**
 * Centralized error handler — extracts a human-readable message from
 * any thrown value and shows a toast notification.
 *
 * Usage:
 *   } catch (err) {
 *     handleError(err);
 *   }
 *
 * Or with a custom title:
 *   } catch (err) {
 *     handleError(err, "Failed to save quotation");
 *   }
 */
export function handleError(err: unknown, title = "Action failed"): void {
  const msg = errorMessage(err, "An unexpected error occurred.");
  toastError(title, msg);
}

/**
 * Silent error handler — returns the readable message without showing a toast.
 * Useful when you want to set error state manually.
 */
export function extractError(err: unknown, fallback = "Request failed."): string {
  return errorMessage(err, fallback);
}
