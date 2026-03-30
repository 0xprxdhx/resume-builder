"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties, ReactNode } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SortableItemProps {
  /** Unique stable id — must match the id passed to <SortableContext items={[]}> */
  id: string;
  /** The card content rendered inside the sortable wrapper */
  children: ReactNode;
  /** Optionally disable dragging for this item (e.g. only one entry exists) */
  disabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SortableItem
//
// A drag-and-drop wrapper built on @dnd-kit/sortable.
// Renders a drag handle (⠿) pinned to the left edge of the card.
// The handle is the only draggable surface — card inputs remain clickable.
//
// Visual states:
//   idle      → card sits normally, handle is dim
//   hover     → handle glows lime, card border brightens
//   dragging  → card becomes translucent + lifted with a glow shadow,
//               a lime-coloured "ghost" outline takes its place in the list
// ─────────────────────────────────────────────────────────────────────────────

export default function SortableItem({ id, children, disabled = false }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
    isOver,
  } = useSortable({
    id,
    disabled,
  });

  // ── Wrapper styles ────────────────────────────────────────────────────────

  const wrapperStyle: CSSProperties = {
    position: "relative",
    // dnd-kit applies transform + transition during drag
    transform: CSS.Transform.toString(transform),
    transition: transition ?? "transform 200ms cubic-bezier(0.16, 1, 0.3, 1)",
    // While this item is being dragged, shrink it slightly and fade it
    // so the user sees their cursor "lifting" it
    opacity: isDragging ? 0.45 : 1,
    scale: isDragging ? "0.98" : "1",
    // Elevated shadow while dragging
    zIndex: isDragging ? 50 : "auto",
    // Cursor changes
    cursor: isDragging ? "grabbing" : "auto",
  };

  // Highlight the drop target when another card hovers over this slot
  const dropIndicatorStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: "14px",
    border: isOver ? "2px dashed rgba(200, 255, 0, 0.55)" : "2px solid transparent",
    pointerEvents: "none",
    transition: "border-color 160ms ease",
    zIndex: 10,
  };

  // ── Drag handle styles ────────────────────────────────────────────────────
  // Placed absolutely on the left edge of the wrapper so it floats
  // over whatever card content is rendered inside children.

  const handleStyle: CSSProperties = {
    // Positioning — left strip of the card
    position: "absolute",
    left: "10px",
    top: "50%",
    transform: "translateY(-50%)",
    zIndex: 20,

    // Size
    width: "18px",
    height: "36px",

    // Appearance
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    borderRadius: "4px",
    background: "transparent",
    padding: 0,

    // Typography — braille dots icon
    fontSize: "15px",
    lineHeight: 1,
    letterSpacing: "-1px",
    color: disabled ? "transparent" : "var(--ink-dim, #5a5a7a)",

    // Interaction
    cursor: disabled ? "default" : "grab",
    touchAction: "none",           // required for mobile dnd-kit
    userSelect: "none",
    WebkitUserSelect: "none",

    // Motion
    transition: "color 120ms ease, background 120ms ease, box-shadow 120ms ease",
  };

  return (
    // setNodeRef registers this element as the sortable node.
    // The transform + transition animate it during drag.
    <div ref={setNodeRef} style={wrapperStyle}>

      {/* Drop-target highlight ring */}
      <div style={dropIndicatorStyle} aria-hidden />

      {/* Drag handle — only this element triggers dragging via setActivatorNodeRef */}
      {!disabled && (
        <button
          ref={setActivatorNodeRef}
          style={handleStyle}
          aria-label="Drag to reorder"
          title="Drag to reorder"
          // Spread dnd-kit's keyboard + pointer listeners onto the handle only.
          // This means clicks/typing inside the card's inputs don't accidentally
          // start a drag.
          // Note: tabIndex is provided by {...attributes} from dnd-kit — don't set it twice.
          {...attributes}
          {...listeners}

          // Inline hover — we can't use :hover in inline styles, so we handle
          // it with onMouseEnter / onMouseLeave to toggle the glow manually.
          onMouseEnter={(e) => {
            const el = e.currentTarget;
            el.style.color = "var(--lime, #c8ff00)";
            el.style.background = "var(--lime-dim, rgba(200,255,0,0.10))";
            el.style.boxShadow = "0 0 8px var(--lime-glow, rgba(200,255,0,0.18))";
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget;
            el.style.color = "var(--ink-dim, #5a5a7a)";
            el.style.background = "transparent";
            el.style.boxShadow = "none";
          }}
          onFocus={(e) => {
            const el = e.currentTarget;
            el.style.color = "var(--lime, #c8ff00)";
            el.style.background = "var(--lime-dim, rgba(200,255,0,0.10))";
            el.style.outline = "2px solid var(--lime, #c8ff00)";
            el.style.outlineOffset = "2px";
          }}
          onBlur={(e) => {
            const el = e.currentTarget;
            el.style.color = "var(--ink-dim, #5a5a7a)";
            el.style.background = "transparent";
            el.style.outline = "none";
          }}
        >
          ⠿
        </button>
      )}

      {/* Card content */}
      {children}
    </div>
  );
}