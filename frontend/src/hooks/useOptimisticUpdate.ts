import { useState, useCallback } from 'react';

export interface OptimisticUpdateOptions<T> {
  onSuccess?: (result: T) => void;
  onError?: (error: any) => void;
  revertOnError?: boolean;
}

export interface UseOptimisticUpdateReturn<T> {
  isLoading: boolean;
  execute: (
    optimisticUpdate: () => void,
    asyncOperation: () => Promise<T>,
    options?: OptimisticUpdateOptions<T>
  ) => Promise<void>;
}

export const useOptimisticUpdate = <T = any>(): UseOptimisticUpdateReturn<T> => {
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (
      optimisticUpdate: () => void,
      asyncOperation: () => Promise<T>,
      options: OptimisticUpdateOptions<T> = {}
    ) => {
      const { onSuccess, onError, revertOnError = true } = options;

      setIsLoading(true);

      // Store the current state for potential revert
      let revertFunction: (() => void) | null = null;
      
      if (revertOnError) {
        // This is a simplified approach - in a real app you might want to
        // capture more sophisticated state snapshots
        const beforeUpdate = Date.now();
        revertFunction = () => {
          // The actual revert logic would depend on your state management
          // For now, we'll rely on the calling code to handle reverts
          console.warn('Optimistic update failed, consider implementing revert logic');
        };
      }

      try {
        // Apply optimistic update immediately
        optimisticUpdate();

        // Execute the async operation
        const result = await asyncOperation();

        // Call success callback if provided
        onSuccess?.(result);
      } catch (error) {
        // Revert optimistic update if requested
        if (revertOnError && revertFunction) {
          revertFunction();
        }

        // Call error callback if provided
        onError?.(error);

        // Re-throw error so calling code can handle it
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isLoading,
    execute,
  };
};

// Specialized hook for list operations (add, remove, update)
export const useOptimisticList = <T extends { _id: string }>(
  items: T[],
  setItems: (items: T[]) => void
) => {
  const { isLoading: addLoading, execute: executeAdd } = useOptimisticUpdate<T>();
  const { isLoading: removeLoading, execute: executeRemove } = useOptimisticUpdate<void>();
  const { isLoading: updateLoading, execute: executeUpdate } = useOptimisticUpdate<T>();

  const addItem = useCallback(
    async (
      newItem: T,
      asyncAdd: () => Promise<T>,
      options?: OptimisticUpdateOptions<T>
    ) => {
      return executeAdd(
        () => setItems([...items, newItem]),
        asyncAdd,
        {
          ...options,
          onError: (error) => {
            // Revert by removing the optimistically added item
            setItems(items.filter(item => item._id !== newItem._id));
            options?.onError?.(error);
          },
        }
      );
    },
    [items, setItems, executeAdd]
  );

  const removeItem = useCallback(
    async (
      itemId: string,
      asyncRemove: () => Promise<void>,
      options?: OptimisticUpdateOptions<void>
    ) => {
      const itemToRemove = items.find(item => item._id === itemId);
      if (!itemToRemove) return;

      return executeRemove(
        () => setItems(items.filter(item => item._id !== itemId)),
        asyncRemove,
        {
          ...options,
          onError: (error) => {
            // Revert by adding the item back
            setItems([...items, itemToRemove]);
            options?.onError?.(error);
          },
        }
      );
    },
    [items, setItems, executeRemove]
  );

  const updateItem = useCallback(
    async (
      itemId: string,
      updates: Partial<T>,
      asyncUpdate: () => Promise<T>,
      options?: OptimisticUpdateOptions<T>
    ) => {
      const originalItem = items.find(item => item._id === itemId);
      if (!originalItem) return;

      const updatedItem = { ...originalItem, ...updates };

      return executeUpdate(
        () => setItems(items.map(item => 
          item._id === itemId ? updatedItem : item
        )),
        asyncUpdate,
        {
          ...options,
          onError: (error) => {
            // Revert by restoring the original item
            setItems(items.map(item => 
              item._id === itemId ? originalItem : item
            ));
            options?.onError?.(error);
          },
        }
      );
    },
    [items, setItems, executeUpdate]
  );

  return {
    isLoading: addLoading || removeLoading || updateLoading,
    addItem,
    removeItem,
    updateItem,
  };
};