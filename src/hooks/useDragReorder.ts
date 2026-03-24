import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface DragItem {
  id: string;
  index: number;
}

export const useDragReorder = () => {
  const [draggedItem, setDraggedItem] = useState<DragItem | null>(null);

  const handleDragStart = useCallback((e: React.DragEvent, id: string, index: number) => {
    setDraggedItem({ id, index });
    e.dataTransfer!.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropIndex: number, items: any[]) => {
      e.preventDefault();
      if (!draggedItem) return;

      const dragIndex = draggedItem.index;
      if (dragIndex === dropIndex) {
        setDraggedItem(null);
        return;
      }

      // Reorder items
      const reorderedItems = [...items];
      const [draggedItemData] = reorderedItems.splice(dragIndex, 1);
      reorderedItems.splice(dropIndex, 0, draggedItemData);

      // Update display_order
      const updatedItems = reorderedItems.map((item, index) => ({
        ...item,
        display_order: index,
      }));

      setDraggedItem(null);
      return updatedItems;
    },
    [draggedItem]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  const saveOrderToDatabase = useCallback(
    async (
      tableName: 'media_page_content' | 'masterclass_page_content',
      items: any[]
    ) => {
      try {
        // Batch update all items with new display_order
        for (const item of items) {
          const { error } = await supabase
            .from(tableName)
            .update({ display_order: item.display_order })
            .eq('id', item.id);

          if (error) throw error;
        }

        return { success: true };
      } catch (err) {
        console.error('Error saving order to database:', err);
        return { success: false, error: err };
      }
    },
    []
  );

  return {
    draggedItem,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    saveOrderToDatabase,
  };
};
