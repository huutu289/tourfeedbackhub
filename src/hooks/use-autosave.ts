import {useEffect, useRef, useCallback} from 'react';
import {useToast} from './use-toast';

interface AutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<{success: boolean; error?: string}>;
  interval?: number; // milliseconds
  enabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export function useAutosave<T>({
  data,
  onSave,
  interval = 30000, // 30 seconds default
  enabled = true,
  onSuccess,
  onError,
}: AutosaveOptions<T>) {
  const {toast} = useToast();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedDataRef = useRef<string>();
  const isSavingRef = useRef(false);

  const save = useCallback(async () => {
    if (isSavingRef.current) {
      return;
    }

    const currentData = JSON.stringify(data);

    // Don't save if data hasn't changed
    if (currentData === lastSavedDataRef.current) {
      return;
    }

    isSavingRef.current = true;

    try {
      const result = await onSave(data);

      if (result.success) {
        lastSavedDataRef.current = currentData;
        onSuccess?.();

        toast({
          title: 'Draft saved',
          description: 'Your changes have been saved automatically',
          duration: 2000,
        });
      } else {
        onError?.(result.error || 'Failed to save');

        toast({
          title: 'Autosave failed',
          description: result.error || 'Failed to save draft',
          variant: 'destructive',
          duration: 3000,
        });
      }
    } catch (error: any) {
      onError?.(error.message);

      toast({
        title: 'Autosave error',
        description: error.message,
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      isSavingRef.current = false;
    }
  }, [data, onSave, onSuccess, onError, toast]);

  useEffect(() => {
    if (!enabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      save();
    }, interval);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, enabled, interval, save]);

  // Manual save function
  const manualSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    return save();
  }, [save]);

  return {
    save: manualSave,
    isSaving: isSavingRef.current,
  };
}
