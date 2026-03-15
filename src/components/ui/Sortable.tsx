"use client";

import type { ReactNode } from "react";
import { type DragEndEvent, DndContext, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SortableItemProps = {
  id: string;
  children: ReactNode;
};

function SortableItem({ id, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative mb-2 ${isDragging ? "z-10 opacity-80" : ""}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    >
      <div className="flex items-start gap-2">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="mt-3 flex-shrink-0 touch-none px-1 text-gray-400 hover:text-gray-600"
          aria-label="Drag to reorder"
          {...listeners}
          {...attributes}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

type SortableListProps = {
  items: { id: string }[];
  onReorder: (oldIndex: number, newIndex: number) => void;
  children: (item: { id: string }, index: number) => ReactNode;
};

export function SortableList({ items, onReorder, children }: SortableListProps) {
  const ids = items.map((item) => item.id);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id && typeof active.id === "string" && typeof over.id === "string") {
      const oldIndex = ids.indexOf(active.id);
      const newIndex = ids.indexOf(over.id);
      onReorder(oldIndex, newIndex);
    }
  };

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {items.map((item, index) => (
          <SortableItem key={item.id} id={item.id}>
            {children(item, index)}
          </SortableItem>
        ))}
      </SortableContext>
    </DndContext>
  );
}
