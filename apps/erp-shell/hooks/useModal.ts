"use client";

import { useState, useCallback } from "react";

interface UseModalReturn<T> {
  isOpen: boolean;
  selected: T | null;
  open: (item?: T) => void;
  close: () => void;
  replace: (item: T) => void;
}

/**
 * Modal state hook that manages open/close and selected item state.
 * Works for both "create" (no item) and "edit/view" (with item) modals.
 *
 * @example
 * ```tsx
 * const createModal = useModal<Lead>();
 * const detailModal = useModal<Lead>();
 *
 * <Button onClick={() => createModal.open()}>New Lead</Button>
 * <Button onClick={() => detailModal.open(lead)}>View Lead</Button>
 * ```
 */
export function useModal<T = undefined>(): UseModalReturn<T> {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<T | null>(null);

  const open = useCallback((item?: T) => {
    setSelected(item ?? (undefined as unknown as T));
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setSelected(null);
  }, []);

  const replace = useCallback((item: T) => {
    setSelected(item);
  }, []);

  return { isOpen, selected, open, close, replace };
}
