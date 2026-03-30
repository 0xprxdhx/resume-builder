"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TemplateOne from "@/src/components/templates/TemplateOne";
import TemplateTwo from "@/src/components/templates/TemplateTwo";
import TemplateThree from "@/src/components/templates/TemplateThree";
import Auth from "@/src/components/Auth";
import { supabase } from "@/src/lib/supabase";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import SortableItem from "@/src/components/SortableItem";


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Experience {
  id: string;
  company: string;
  role: string;
  start: string;
  end: string;
  current: boolean;
  bullets: string[];
}

interface Project {
  id: string;
  title: string;
  description: string;
  url: string;
  start: string;
  end: string;
}

interface Education {
  id: string;
  school: string;
  degree: string;
  start: string;
  end: string;
}

interface Resume {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  links: string[];
  skills: string[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
}

type SectionKey = "basics" | "summary" | "links" | "skills" | "experience" | "projects" | "education";


// ─────────────────────────────────────────────────────────────────────────────
// Defaults & helpers
// ─────────────────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_RESUME: Resume = {
  name: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  links: [""],
  skills: [""],
  experience: [{ id: uid(), company: "", role: "", start: "", end: "", current: false, bullets: [""] }],
  projects: [{ id: uid(), title: "", description: "", url: "", start: "", end: "" }],
  education: [{ id: uid(), school: "", degree: "", start: "", end: "" }],
};

const SECTION_META: { key: SectionKey; label: string; icon: string }[] = [
  { key: "basics",     label: "Basics",     icon: "◉" },
  { key: "summary",    label: "Summary",    icon: "❦" },
  { key: "links",      label: "Links",      icon: "⌁" },
  { key: "skills",     label: "Skills",     icon: "◈" },
  { key: "experience", label: "Experience", icon: "◎" },
  { key: "projects",   label: "Projects",   icon: "◇" },
  { key: "education",  label: "Education",  icon: "◻" },
];




// ─────────────────────────────────────────────────────────────────────────────
// Small UI atoms
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="section-header">
      <span className="section-label">{label}</span>
      <div className="section-rule" />
    </div>
  );
}

function Field({
  label,
  children,
  half,
}: {
  label?: string;
  children: React.ReactNode;
  half?: boolean;
}) {
  return (
    <div className={`field ${half ? "field--half" : ""}`}>
      {label && <label className="field-label">{label}</label>}
      {children}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="field-grid">{children}</div>;
}

function RemoveBtn({ onClick, title = "Remove" }: { onClick: () => void; title?: string }) {
  return (
    <button className="remove-btn" onClick={onClick} title={title} aria-label={title}>
      ✕
    </button>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="add-btn" onClick={onClick}>
      <span>+</span> {label}
    </button>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  const [template, setTemplate] = useState<"one" | "two" | "three">("one");
  const [user, setUser] = useState<any>(null);
  const [resume, setResume] = useState<Resume>(DEFAULT_RESUME);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("basics");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );


  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3200);
  }, []);


  // ── Auth & data ───────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data?.data) setResume(migrateResume(data.data));
    })();
  }, [user]);

  // Migrate older saved resumes that lack new fields
  function migrateResume(raw: any): Resume {
    return {
      ...DEFAULT_RESUME,
      ...raw,
      experience: (raw.experience ?? []).map((e: any) => ({
        id: e.id ?? uid(),
        current: e.current ?? false,
        bullets: e.bullets ?? [""],
        ...e,
      })),
      projects: (raw.projects ?? []).map((p: any) => ({
        id: p.id ?? uid(),
        url: p.url ?? "",
        ...p,
      })),
      education: (raw.education ?? []).map((ed: any) => ({
        id: ed.id ?? uid(),
        ...ed,
      })),
    };
  }

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setResume(DEFAULT_RESUME);
  };


  // ── Resume state helpers ──────────────────────────────────────────────────

  const update = <K extends keyof Resume>(field: K, value: Resume[K]) =>
    setResume((prev) => ({ ...prev, [field]: value }));

  function updateArrayItem<T extends { id: string }>(
    field: keyof Resume,
    id: string,
    patch: Partial<T>
  ) {
    const arr = (resume[field] as T[]).map((item) =>
      item.id === id ? { ...item, ...patch } : item
    );
    update(field as any, arr as any);
  }

  function removeArrayItem(field: keyof Resume, id: string, fallback: any) {
    const arr = (resume[field] as any[]).filter((item) => item.id !== id);
    update(field as any, arr.length ? arr : [fallback()]);
  }

  // DnD reorder
  function handleDragEnd(event: DragEndEvent, field: "experience" | "projects" | "education") {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const items = resume[field] as { id: string }[];
    const oldIdx = items.findIndex((x) => x.id === active.id);
    const newIdx = items.findIndex((x) => x.id === over.id);
    update(field, arrayMove(items, oldIdx, newIdx) as any);
  }


  // ── PDF download ──────────────────────────────────────────────────────────

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resume),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${resume.name || "resume"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("PDF downloaded ✓");
    } catch {
      showToast("PDF generation failed", "err");
    } finally {
      setDownloading(false);
    }
  };


  // ── Save / Load ───────────────────────────────────────────────────────────

  const saveResume = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("resumes")
        .upsert([{ user_id: user.id, data: resume }], { onConflict: "user_id" });
      if (error) throw error;
      showToast("Saved ✓");
    } catch {
      showToast("Save failed", "err");
    } finally {
      setSaving(false);
    }
  };

  const loadResume = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("resumes")
        .select("data")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      if (data?.data) setResume(migrateResume(data.data));
      showToast("Loaded ✓");
    } catch {
      showToast("Could not load resume", "err");
    } finally {
      setLoading(false);
    }
  };


  // ── Guard ─────────────────────────────────────────────────────────────────

  if (!user) return <Auth setUser={setUser} />;


  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&family=Instrument+Sans:wght@300;400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --ink:        #111010;
          --ink-2:      #3a3836;
          --ink-3:      #918d88;
          --ink-4:      #c2bdb7;
          --paper:      #f7f4ef;
          --paper-2:    #eeebe4;
          --paper-3:    #e5e1d8;
          --surface:    #ffffff;
          --accent:     #b83a0a;
          --accent-2:   #d9530f;
          --accent-lt:  #f7ede8;
          --accent-dim: rgba(184, 58, 10, 0.12);
          --border:     #dcd8d0;
          --border-2:   #ccc8bf;
          --radius-sm:  3px;
          --radius:     5px;
          --radius-lg:  8px;
          --mono:       'JetBrains Mono', monospace;
          --sans:       'Instrument Sans', sans-serif;
          --serif:      'Cormorant Garamond', serif;
          --ease:       cubic-bezier(0.22, 1, 0.36, 1);
          --t:          160ms;
        }

        html, body {
          height: 100%;
          background: var(--paper);
          color: var(--ink);
          font-family: var(--sans);
          -webkit-font-smoothing: antialiased;
        }

        /* ══════════════════════════════════════════
           LAYOUT
        ══════════════════════════════════════════ */

        .app {
          display: grid;
          grid-template-columns: 280px 1fr;
          grid-template-rows: 56px 1fr;
          height: 100vh;
          overflow: hidden;
        }

        /* ══════════════════════════════════════════
           TOPBAR
        ══════════════════════════════════════════ */

        .topbar {
          grid-column: 1 / -1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px 0 24px;
          border-bottom: 1px solid var(--border);
          background: var(--paper);
          z-index: 20;
        }

        .brand {
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-family: var(--serif);
          font-size: 20px;
          font-weight: 500;
          letter-spacing: -0.2px;
          color: var(--ink);
          line-height: 1;
          user-select: none;
        }

        .brand-dot { color: var(--accent); font-size: 24px; line-height: 0.8; }

        .brand-sub {
          font-family: var(--mono);
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-3);
          align-self: center;
          margin-bottom: 1px;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* ══════════════════════════════════════════
           BUTTONS
        ══════════════════════════════════════════ */

        .btn {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-family: var(--mono);
          font-size: 10.5px;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 7px 13px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
          background: transparent;
          color: var(--ink-2);
          cursor: pointer;
          transition: background var(--t) var(--ease),
                      border-color var(--t) var(--ease),
                      color var(--t) var(--ease),
                      opacity var(--t);
          white-space: nowrap;
          line-height: 1;
        }

        .btn:hover:not(:disabled) {
          background: var(--paper-2);
          border-color: var(--border-2);
          color: var(--ink);
        }

        .btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .btn-primary {
          background: var(--ink);
          color: var(--paper);
          border-color: var(--ink);
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--ink-2);
          border-color: var(--ink-2);
          color: var(--paper);
        }

        .btn-accent {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }

        .btn-accent:hover:not(:disabled) {
          background: var(--accent-2);
          border-color: var(--accent-2);
          color: #fff;
        }

        .btn-ghost {
          border-color: transparent;
          color: var(--ink-3);
          padding: 7px 10px;
        }

        .btn-ghost:hover:not(:disabled) {
          background: var(--paper-2);
          border-color: transparent;
          color: var(--ink-2);
        }

        /* Spinner */
        .btn-spinner {
          display: inline-block;
          width: 10px; height: 10px;
          border: 1.5px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
          flex-shrink: 0;
        }

        @keyframes spin { to { transform: rotate(360deg); } }

        /* ══════════════════════════════════════════
           SIDEBAR
        ══════════════════════════════════════════ */

        .sidebar {
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border);
          background: var(--paper);
          overflow: hidden;
        }

        /* Section nav */
        .sec-nav {
          padding: 16px 12px 8px;
          display: flex;
          flex-direction: column;
          gap: 1px;
          border-bottom: 1px solid var(--border);
        }

        .sec-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 12px;
          border-radius: var(--radius);
          font-family: var(--mono);
          font-size: 10.5px;
          font-weight: 400;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--ink-3);
          cursor: pointer;
          border: none;
          background: transparent;
          text-align: left;
          transition: background var(--t) var(--ease), color var(--t) var(--ease);
        }

        .sec-nav-item:hover { background: var(--paper-2); color: var(--ink-2); }

        .sec-nav-item.active {
          background: var(--accent-dim);
          color: var(--accent);
          font-weight: 500;
        }

        .sec-icon {
          font-size: 12px;
          width: 16px;
          text-align: center;
          flex-shrink: 0;
          opacity: 0.7;
          transition: opacity var(--t);
        }

        .sec-nav-item.active .sec-icon { opacity: 1; }

        /* Template switcher */
        .tmpl-switcher {
          padding: 10px 12px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px;
          border-bottom: 1px solid var(--border);
        }

        .tmpl-btn {
          padding: 7px;
          font-family: var(--mono);
          font-size: 9.5px;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
          background: transparent;
          color: var(--ink-3);
          cursor: pointer;
          transition: all var(--t) var(--ease);
          text-align: center;
        }

        .tmpl-btn.active {
          background: var(--ink);
          color: var(--paper);
          border-color: var(--ink);
        }

        .tmpl-btn:not(.active):hover { background: var(--paper-2); color: var(--ink-2); }

        /* Editor body */
        .editor-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px 16px 48px;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }

        /* ══════════════════════════════════════════
           SECTION HEADER
        ══════════════════════════════════════════ */

        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
        }

        .section-label {
          font-family: var(--mono);
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-4);
          white-space: nowrap;
        }

        .section-rule {
          flex: 1;
          height: 1px;
          background: var(--border);
        }

        /* ══════════════════════════════════════════
           FIELDS
        ══════════════════════════════════════════ */

        .field {
          margin-bottom: 10px;
        }

        .field--half { flex: 1; }

        .field-label {
          display: block;
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-3);
          margin-bottom: 5px;
          user-select: none;
        }

        .field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-bottom: 10px;
        }

        input, textarea, select {
          width: 100%;
          font-family: var(--sans);
          font-size: 13px;
          font-weight: 400;
          color: var(--ink);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          outline: none;
          transition: border-color var(--t) var(--ease), box-shadow var(--t) var(--ease);
          appearance: none;
          -webkit-appearance: none;
          line-height: 1.4;
        }

        input[type="date"] {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--ink-2);
        }

        input::placeholder, textarea::placeholder { color: var(--ink-4); }

        input:focus, textarea:focus, select:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 2.5px var(--accent-dim);
          background: #fff;
        }

        textarea {
          resize: vertical;
          min-height: 76px;
          line-height: 1.55;
        }

        /* Checkbox */
        .check-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
        }

        .check-row input[type="checkbox"] {
          width: 14px;
          height: 14px;
          accent-color: var(--accent);
          cursor: pointer;
          flex-shrink: 0;
          padding: 0;
        }

        .check-row label {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.07em;
          text-transform: uppercase;
          color: var(--ink-2);
          cursor: pointer;
          user-select: none;
        }

        /* Inline field row (for link/skill lists) */
        .inline-row {
          display: flex;
          gap: 6px;
          margin-bottom: 7px;
          align-items: center;
        }

        /* ══════════════════════════════════════════
           CARDS (repeatable items)
        ══════════════════════════════════════════ */

        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 14px 14px 14px 30px;
          margin-bottom: 10px;
          position: relative;
          transition: box-shadow var(--t) var(--ease);
        }

        .card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 11px;
        }

        .card-label {
          font-family: var(--mono);
          font-size: 9px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--ink-4);
        }

        .drag-handle {
          position: absolute;
          left: 8px;
          top: 50%;
          transform: translateY(-50%);
          width: 18px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: none;
          background: transparent;
          color: var(--ink-4);
          font-size: 14px;
          cursor: grab;
          border-radius: 3px;
          transition: color var(--t), background var(--t);
          padding: 0;
          line-height: 1;
          letter-spacing: -1px;
        }

        .drag-handle:hover { color: var(--ink-2); background: var(--paper-2); }
        .drag-handle:active { cursor: grabbing; }

        /* Bullets within experience */
        .bullet-list { margin-top: 8px; }

        .bullet-row {
          display: flex;
          gap: 6px;
          margin-bottom: 6px;
          align-items: flex-start;
        }

        .bullet-dot {
          width: 18px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          color: var(--ink-3);
          flex-shrink: 0;
          margin-top: 0;
        }

        .bullet-row textarea {
          min-height: 0;
          height: 34px;
          resize: none;
          overflow: hidden;
          line-height: 1.45;
          padding: 7px 10px;
        }

        /* ══════════════════════════════════════════
           ADD / REMOVE buttons
        ══════════════════════════════════════════ */

        .remove-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px; height: 22px;
          border-radius: 3px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--ink-4);
          cursor: pointer;
          font-size: 11px;
          transition: background var(--t), color var(--t), border-color var(--t);
          flex-shrink: 0;
          padding: 0;
          line-height: 1;
        }

        .remove-btn:hover {
          background: #fce8e3;
          color: var(--accent);
          border-color: #f2c9bc;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          padding: 8px 12px;
          border: 1px dashed var(--border-2);
          border-radius: var(--radius);
          background: transparent;
          color: var(--ink-3);
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background var(--t), color var(--t), border-color var(--t);
          margin-top: 6px;
        }

        .add-btn:hover {
          background: var(--paper-2);
          color: var(--ink);
          border-color: var(--ink-3);
        }

        .add-btn span { font-size: 14px; line-height: 1; }

        /* ══════════════════════════════════════════
           PREVIEW PANE
        ══════════════════════════════════════════ */

        .preview-pane {
          overflow-y: auto;
          background: var(--paper-3);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 32px 24px 56px;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }

        .preview-inner {
          width: 100%;
          max-width: 760px;
          background: #fff;
          box-shadow:
            0 1px 2px rgba(0,0,0,0.04),
            0 4px 16px rgba(0,0,0,0.08),
            0 12px 40px rgba(0,0,0,0.06);
          border-radius: 2px;
          min-height: 1056px;
          overflow: hidden;
        }

        /* ══════════════════════════════════════════
           TOAST
        ══════════════════════════════════════════ */

        .toast {
          position: fixed;
          bottom: 28px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--ink);
          color: var(--paper);
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.05em;
          padding: 9px 18px;
          border-radius: 40px;
          z-index: 200;
          animation: toastIn 0.24s var(--ease);
          white-space: nowrap;
          pointer-events: none;
        }

        .toast.err { background: var(--accent); }

        @keyframes toastIn {
          from { transform: translateX(-50%) translateY(10px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }

        /* ══════════════════════════════════════════
           DIVIDER
        ══════════════════════════════════════════ */

        .gap { margin-top: 22px; }

        /* ══════════════════════════════════════════
           SCROLLBAR
        ══════════════════════════════════════════ */

        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--ink-4); }
      `}</style>

      <div className="app">

        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="brand">
            résumé<span className="brand-dot">·</span>studio
            <span className="brand-sub">builder</span>
          </div>
          <div className="topbar-right">
            <button className="btn" onClick={loadResume} disabled={loading || saving}>
              {loading ? <><span className="btn-spinner" /> Loading</> : "↓ Load"}
            </button>
            <button className="btn btn-primary" onClick={saveResume} disabled={saving || loading}>
              {saving ? <><span className="btn-spinner" /> Saving</> : "↑ Save"}
            </button>
            <button className="btn btn-accent" onClick={downloadPDF} disabled={downloading}>
              {downloading ? <><span className="btn-spinner" /> Generating</> : "↓ PDF"}
            </button>
            <button className="btn btn-ghost" onClick={logout}>Sign out</button>
          </div>
        </header>

        {/* ── Sidebar ── */}
        <aside className="sidebar">

          {/* Section nav */}
          <nav className="sec-nav">
            {SECTION_META.map(({ key, label, icon }) => (
              <button
                key={key}
                className={`sec-nav-item ${activeSection === key ? "active" : ""}`}
                onClick={() => setActiveSection(key)}
              >
                <span className="sec-icon">{icon}</span>
                {label}
              </button>
            ))}
          </nav>

          {/* Template switcher */}
          <div className="tmpl-switcher">
            <button
              className={`tmpl-btn ${template === "one" ? "active" : ""}`}
              onClick={() => setTemplate("one")}
            >
              Template 01
            </button>
            <button
              className={`tmpl-btn ${template === "two" ? "active" : ""}`}
              onClick={() => setTemplate("two")}
            >
              Template 02
            </button>
            <button
              className={`tmpl-btn ${template === "three" ? "active" : ""}`}
              onClick={() => setTemplate("three")}
            >
              Template 03
            </button>
          </div>

          {/* ── Editor panels ── */}
          <div className="editor-body">

            {/* BASICS */}
            {activeSection === "basics" && (
              <div>
                <SectionHeader label="Basic Info" />
                <Field label="Full Name">
                  <input
                    placeholder="Jane Smith"
                    value={resume.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </Field>
                <Field label="Professional Title">
                  <input
                    placeholder="Software Engineer"
                    value={resume.title}
                    onChange={(e) => update("title", e.target.value)}
                  />
                </Field>
                <FieldGrid>
                  <Field label="Email">
                    <input
                      type="email"
                      placeholder="jane@example.com"
                      value={resume.email}
                      onChange={(e) => update("email", e.target.value)}
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      placeholder="+1 555 000 0000"
                      value={resume.phone}
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </Field>
                </FieldGrid>
                <Field label="Location">
                  <input
                    placeholder="San Francisco, CA"
                    value={resume.location}
                    onChange={(e) => update("location", e.target.value)}
                  />
                </Field>
              </div>
            )}

            {/* SUMMARY */}
            {activeSection === "summary" && (
              <div>
                <SectionHeader label="Professional Summary" />
                <Field>
                  <textarea
                    placeholder="A concise 2–3 sentence summary of your professional identity, key strengths, and career goals…"
                    value={resume.summary}
                    rows={6}
                    onChange={(e) => update("summary", e.target.value)}
                  />
                </Field>
              </div>
            )}

            {/* LINKS */}
            {activeSection === "links" && (
              <div>
                <SectionHeader label="Links" />
                {resume.links.map((l, i) => (
                  <div className="inline-row" key={i}>
                    <input
                      value={l}
                      placeholder="https://github.com/you"
                      onChange={(e) => {
                        const arr = [...resume.links];
                        arr[i] = e.target.value;
                        update("links", arr);
                      }}
                    />
                    <RemoveBtn
                      onClick={() => {
                        const arr = resume.links.filter((_, idx) => idx !== i);
                        update("links", arr.length ? arr : [""]);
                      }}
                    />
                  </div>
                ))}
                <AddBtn onClick={() => update("links", [...resume.links, ""])} label="Add link" />
              </div>
            )}

            {/* SKILLS */}
            {activeSection === "skills" && (
              <div>
                <SectionHeader label="Skills" />
                {resume.skills.map((s, i) => (
                  <div className="inline-row" key={i}>
                    <input
                      value={s}
                      placeholder="e.g. TypeScript"
                      onChange={(e) => {
                        const arr = [...resume.skills];
                        arr[i] = e.target.value;
                        update("skills", arr);
                      }}
                    />
                    <RemoveBtn
                      onClick={() => {
                        const arr = resume.skills.filter((_, idx) => idx !== i);
                        update("skills", arr.length ? arr : [""]);
                      }}
                    />
                  </div>
                ))}
                <AddBtn onClick={() => update("skills", [...resume.skills, ""])} label="Add skill" />
              </div>
            )}

            {/* EXPERIENCE */}
            {activeSection === "experience" && (
              <div>
                <SectionHeader label="Experience" />
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, "experience")}
                >
                  <SortableContext
                    items={resume.experience.map((e) => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {resume.experience.map((exp, i) => (
                      <SortableItem key={exp.id} id={exp.id}>
                        <div className="card">
                          <div className="card-header">
                            <span className="card-label">Position {i + 1}</span>
                            <RemoveBtn
                              onClick={() =>
                                removeArrayItem("experience", exp.id, () => ({
                                  id: uid(), company: "", role: "", start: "", end: "", current: false, bullets: [""],
                                }))
                              }
                            />
                          </div>

                          <Field label="Company">
                            <input
                              placeholder="Acme Corp"
                              value={exp.company}
                              onChange={(e) => updateArrayItem<Experience>("experience", exp.id, { company: e.target.value })}
                            />
                          </Field>
                          <Field label="Role / Title">
                            <input
                              placeholder="Senior Engineer"
                              value={exp.role}
                              onChange={(e) => updateArrayItem<Experience>("experience", exp.id, { role: e.target.value })}
                            />
                          </Field>

                          <FieldGrid>
                            <Field label="Start">
                              <input
                                type="date"
                                value={exp.start}
                                onChange={(e) => updateArrayItem<Experience>("experience", exp.id, { start: e.target.value })}
                              />
                            </Field>
                            <Field label="End">
                              <input
                                type="date"
                                value={exp.end}
                                disabled={exp.current}
                                onChange={(e) => updateArrayItem<Experience>("experience", exp.id, { end: e.target.value })}
                              />
                            </Field>
                          </FieldGrid>

                          <div className="check-row">
                            <input
                              type="checkbox"
                              id={`current-${exp.id}`}
                              checked={exp.current}
                              onChange={(e) => updateArrayItem<Experience>("experience", exp.id, { current: e.target.checked, end: e.target.checked ? "" : exp.end })}
                            />
                            <label htmlFor={`current-${exp.id}`}>Present / Current role</label>
                          </div>

                          {/* Bullet points */}
                          <div className="bullet-list">
                            {exp.bullets.map((b, bi) => (
                              <div className="bullet-row" key={bi}>
                                <span className="bullet-dot">•</span>
                                <textarea
                                  value={b}
                                  placeholder="Achieved X by doing Y, resulting in Z…"
                                  onChange={(e) => {
                                    const bullets = [...exp.bullets];
                                    bullets[bi] = e.target.value;
                                    updateArrayItem<Experience>("experience", exp.id, { bullets });
                                  }}
                                  rows={1}
                                  onInput={(e) => {
                                    const t = e.currentTarget;
                                    t.style.height = "auto";
                                    t.style.height = t.scrollHeight + "px";
                                  }}
                                />
                                <RemoveBtn
                                  onClick={() => {
                                    const bullets = exp.bullets.filter((_, idx) => idx !== bi);
                                    updateArrayItem<Experience>("experience", exp.id, { bullets: bullets.length ? bullets : [""] });
                                  }}
                                />
                              </div>
                            ))}
                            <AddBtn
                              onClick={() => updateArrayItem<Experience>("experience", exp.id, { bullets: [...exp.bullets, ""] })}
                              label="Add bullet"
                            />
                          </div>
                        </div>
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
                <AddBtn
                  onClick={() =>
                    update("experience", [
                      ...resume.experience,
                      { id: uid(), company: "", role: "", start: "", end: "", current: false, bullets: [""] },
                    ])
                  }
                  label="Add position"
                />
              </div>
            )}

            {/* PROJECTS */}
            {activeSection === "projects" && (
              <div>
                <SectionHeader label="Projects" />
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, "projects")}
                >
                  <SortableContext
                    items={resume.projects.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {resume.projects.map((p, i) => (
                      <SortableItem key={p.id} id={p.id}>
                        <div className="card">
                          <div className="card-header">
                            <span className="card-label">Project {i + 1}</span>
                            <RemoveBtn
                              onClick={() =>
                                removeArrayItem("projects", p.id, () => ({
                                  id: uid(), title: "", description: "", url: "", start: "", end: "",
                                }))
                              }
                            />
                          </div>

                          <Field label="Title">
                            <input
                              placeholder="Awesome Project"
                              value={p.title}
                              onChange={(e) => updateArrayItem<Project>("projects", p.id, { title: e.target.value })}
                            />
                          </Field>
                          <Field label="URL">
                            <input
                              placeholder="https://github.com/you/project"
                              value={p.url}
                              onChange={(e) => updateArrayItem<Project>("projects", p.id, { url: e.target.value })}
                            />
                          </Field>
                          <Field label="Description">
                            <textarea
                              placeholder="What it does, tech used, impact…"
                              value={p.description}
                              onChange={(e) => updateArrayItem<Project>("projects", p.id, { description: e.target.value })}
                            />
                          </Field>
                          <FieldGrid>
                            <Field label="Start">
                              <input
                                type="date"
                                value={p.start}
                                onChange={(e) => updateArrayItem<Project>("projects", p.id, { start: e.target.value })}
                              />
                            </Field>
                            <Field label="End">
                              <input
                                type="date"
                                value={p.end}
                                onChange={(e) => updateArrayItem<Project>("projects", p.id, { end: e.target.value })}
                              />
                            </Field>
                          </FieldGrid>
                        </div>
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
                <AddBtn
                  onClick={() =>
                    update("projects", [
                      ...resume.projects,
                      { id: uid(), title: "", description: "", url: "", start: "", end: "" },
                    ])
                  }
                  label="Add project"
                />
              </div>
            )}

            {/* EDUCATION */}
            {activeSection === "education" && (
              <div>
                <SectionHeader label="Education" />
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, "education")}
                >
                  <SortableContext
                    items={resume.education.map((ed) => ed.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {resume.education.map((edu, i) => (
                      <SortableItem key={edu.id} id={edu.id}>
                        <div className="card">
                          <div className="card-header">
                            <span className="card-label">Entry {i + 1}</span>
                            <RemoveBtn
                              onClick={() =>
                                removeArrayItem("education", edu.id, () => ({
                                  id: uid(), school: "", degree: "", start: "", end: "",
                                }))
                              }
                            />
                          </div>

                          <Field label="School / Institution">
                            <input
                              placeholder="MIT"
                              value={edu.school}
                              onChange={(e) => updateArrayItem<Education>("education", edu.id, { school: e.target.value })}
                            />
                          </Field>
                          <Field label="Degree / Field of Study">
                            <input
                              placeholder="B.Sc. Computer Science"
                              value={edu.degree}
                              onChange={(e) => updateArrayItem<Education>("education", edu.id, { degree: e.target.value })}
                            />
                          </Field>
                          <FieldGrid>
                            <Field label="Start">
                              <input
                                type="date"
                                value={edu.start}
                                onChange={(e) => updateArrayItem<Education>("education", edu.id, { start: e.target.value })}
                              />
                            </Field>
                            <Field label="End">
                              <input
                                type="date"
                                value={edu.end}
                                onChange={(e) => updateArrayItem<Education>("education", edu.id, { end: e.target.value })}
                              />
                            </Field>
                          </FieldGrid>
                        </div>
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
                <AddBtn
                  onClick={() =>
                    update("education", [
                      ...resume.education,
                      { id: uid(), school: "", degree: "", start: "", end: "" },
                    ])
                  }
                  label="Add entry"
                />
              </div>
            )}

          </div>
        </aside>

        {/* ── Preview pane ── */}
        <section className="preview-pane">
          <div className="preview-inner">
            {template === "one" && <TemplateOne resume={resume} />}
            {template === "two" && <TemplateTwo resume={resume} />}
            {template === "three" && <TemplateThree resume={resume} />}
          </div>
        </section>

      </div>"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import TemplateOne   from "@/src/components/templates/TemplateOne";
import TemplateTwo   from "@/src/components/templates/TemplateTwo";
import TemplateThree from "@/src/components/templates/TemplateThree";
import AuthDialog    from "@/src/components/Auth";
import { supabase }  from "@/src/lib/supabase";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import SortableItem from "@/src/components/SortableItem";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Experience {
  id: string;
  company: string;
  role: string;
  start: string;
  end: string;
  current: boolean;
  bullets: string[];
}

interface Project {
  id: string;
  title: string;
  description: string;
  url: string;
  start: string;
  end: string;
}

interface Education {
  id: string;
  school: string;
  degree: string;
  start: string;
  end: string;
}

interface Resume {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  links: string[];
  skills: string[];
  experience: Experience[];
  projects: Project[];
  education: Education[];
}

type SectionKey =
  | "basics"
  | "summary"
  | "links"
  | "skills"
  | "experience"
  | "projects"
  | "education";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const DEFAULT_RESUME: Resume = {
  name: "",
  title: "",
  email: "",
  phone: "",
  location: "",
  summary: "",
  links: [""],
  skills: [""],
  experience: [{ id: uid(), company: "", role: "", start: "", end: "", current: false, bullets: [""] }],
  projects:   [{ id: uid(), title: "", description: "", url: "", start: "", end: "" }],
  education:  [{ id: uid(), school: "", degree: "", start: "", end: "" }],
};

const SECTION_META: { key: SectionKey; label: string; icon: string }[] = [
  { key: "basics",     label: "Basics",     icon: "○" },
  { key: "summary",    label: "Summary",    icon: "≡" },
  { key: "links",      label: "Links",      icon: "↗" },
  { key: "skills",     label: "Skills",     icon: "◇" },
  { key: "experience", label: "Experience", icon: "◈" },
  { key: "projects",   label: "Projects",   icon: "□" },
  { key: "education",  label: "Education",  icon: "△" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Small UI atoms — all styling from globals.css
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="section-header">
      <span className="section-label">{label}</span>
      <div className="section-rule" />
    </div>
  );
}

function Field({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="field">
      {label && <label className="field-label">{label}</label>}
      {children}
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="field-grid">{children}</div>;
}

function RemoveBtn({ onClick, title = "Remove" }: { onClick: () => void; title?: string }) {
  return (
    <button className="remove-btn" onClick={onClick} title={title} aria-label={title}>
      ✕
    </button>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="add-btn" onClick={onClick}>
      <span>+</span> {label}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function Home() {
  // ── UI state ──────────────────────────────────────────────────────────────
  const [template,      setTemplate]      = useState<"one" | "two" | "three">("one");
  const [activeSection, setActiveSection] = useState<SectionKey>("basics");
  const [showAuth,      setShowAuth]      = useState(false);
  const [authMode,      setAuthMode]      = useState<"signin" | "signup">("signin");
  const [toast,         setToast]         = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auth state ────────────────────────────────────────────────────────────
  const [user, setUser] = useState<any>(null);

  // ── Resume state ──────────────────────────────────────────────────────────
  const [resume,      setResume]      = useState<Resume>(DEFAULT_RESUME);
  const [saving,      setSaving]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [downloading, setDownloading] = useState(false);

  // ── DnD sensors ───────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Toast ─────────────────────────────────────────────────────────────────

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, type });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Auth ──────────────────────────────────────────────────────────────────

  // Restore session on mount (works without sign-in too — user stays null)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Auto-load saved resume when user logs in
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data?.data) setResume(migrateResume(data.data));
    })();
  }, [user]);

  function migrateResume(raw: any): Resume {
    return {
      ...DEFAULT_RESUME,
      ...raw,
      experience: (raw.experience ?? []).map((e: any) => ({
        id: e.id ?? uid(), current: e.current ?? false, bullets: e.bullets ?? [""], ...e,
      })),
      projects: (raw.projects ?? []).map((p: any) => ({
        id: p.id ?? uid(), url: p.url ?? "", ...p,
      })),
      education: (raw.education ?? []).map((ed: any) => ({
        id: ed.id ?? uid(), ...ed,
      })),
    };
  }

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setShowAuth(true);
  };

  const handleAuthSuccess = (u: any) => {
    setUser(u);
    setShowAuth(false);
    showToast("Signed in ✓");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setResume(DEFAULT_RESUME);
    showToast("Signed out");
  };

  // ── Resume state helpers ──────────────────────────────────────────────────

  const update = <K extends keyof Resume>(field: K, value: Resume[K]) =>
    setResume((prev) => ({ ...prev, [field]: value }));

  function updateArrayItem<T extends { id: string }>(
    field: keyof Resume,
    id: string,
    patch: Partial<T>
  ) {
    const arr = (resume[field] as T[]).map((item) =>
      item.id === id ? { ...item, ...patch } : item
    );
    update(field as any, arr as any);
  }

  function removeArrayItem(field: keyof Resume, id: string, fallback: () => any) {
    const arr = (resume[field] as any[]).filter((item) => item.id !== id);
    update(field as any, arr.length ? arr : [fallback()]);
  }

  function handleDragEnd(event: DragEndEvent, field: "experience" | "projects" | "education") {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const items = resume[field] as { id: string }[];
    const oldIdx = items.findIndex((x) => x.id === active.id);
    const newIdx = items.findIndex((x) => x.id === over.id);
    update(field, arrayMove(items, oldIdx, newIdx) as any);
  }

  // ── PDF download ──────────────────────────────────────────────────────────

  const downloadPDF = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...resume, template }),
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `${resume.name || "resume"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("PDF downloaded ✓");
    } catch {
      showToast("PDF generation failed", "err");
    } finally {
      setDownloading(false);
    }
  };

  // ── Save / Load ───────────────────────────────────────────────────────────

  const saveResume = async () => {
    if (!user) { openAuth("signin"); showToast("Sign in to save your resume"); return; }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("resumes")
        .upsert([{ user_id: user.id, data: resume }], { onConflict: "user_id" });
      if (error) throw error;
      showToast("Saved ✓");
    } catch {
      showToast("Save failed", "err");
    } finally {
      setSaving(false);
    }
  };

  const loadResume = async () => {
    if (!user) { openAuth("signin"); showToast("Sign in to load your resume"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("resumes")
        .select("data")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      if (data?.data) setResume(migrateResume(data.data));
      showToast("Loaded ✓");
    } catch {
      showToast("Could not load resume", "err");
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="app">

        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="brand">
            résumé<span className="brand-dot">·</span>studio
            <span className="brand-sub">beta</span>
          </div>

          <div className="topbar-right">
            {/* PDF is always available — no sign-in required */}
            <button className="btn" onClick={downloadPDF} disabled={downloading}>
              {downloading ? <><span className="btn-spinner" /> Generating…</> : "↓ Export PDF"}
            </button>

            {user ? (
              <>
                <button className="btn" onClick={loadResume} disabled={loading}>
                  {loading ? <><span className="btn-spinner" /> Loading…</> : "↓ Load"}
                </button>
                <button className="btn btn-primary" onClick={saveResume} disabled={saving}>
                  {saving ? <><span className="btn-spinner" /> Saving…</> : "↑ Save"}
                </button>
                <button className="btn btn-ghost" onClick={logout}>
                  Sign out
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={() => openAuth("signin")}>
                  Sign in
                </button>
                <button className="btn btn-primary" onClick={() => openAuth("signup")}>
                  Sign up free
                </button>
              </>
            )}
          </div>
        </header>

        {/* ── Sidebar ── */}
        <aside className="sidebar">

          {/* Section navigation */}
          <nav className="sec-nav">
            {SECTION_META.map(({ key, label, icon }) => (
              <button
                key={key}
                className={`sec-nav-item${activeSection === key ? " active" : ""}`}
                onClick={() => setActiveSection(key)}
              >
                <span className="sec-icon">{icon}</span>
                {label}
              </button>
            ))}
          </nav>

          {/* Template switcher */}
          <div className="tmpl-switcher">
            {(["one", "two", "three"] as const).map((t, i) => (
              <button
                key={t}
                className={`tmpl-btn${template === t ? " active" : ""}`}
                onClick={() => setTemplate(t)}
              >
                Layout 0{i + 1}
              </button>
            ))}
          </div>

          {/* Editor panels */}
          <div className="editor-body">

            {/* ── BASICS ── */}
            {activeSection === "basics" && (
              <div>
                <SectionHeader label="Basic Info" />
                <Field label="Full Name">
                  <input
                    placeholder="Jane Smith"
                    value={resume.name}
                    onChange={(e) => update("name", e.target.value)}
                  />
                </Field>
                <Field label="Professional Title">
                  <input
                    placeholder="Software Engineer"
                    value={resume.title}
                    onChange={(e) => update("title", e.target.value)}
                  />
                </Field>
                <FieldGrid>
                  <Field label="Email">
                    <input
                      type="email"
                      placeholder="jane@example.com"
                      value={resume.email}
                      onChange={(e) => update("email", e.target.value)}
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      type="tel"
                      placeholder="+1 555 000 0000"
                      value={resume.phone}
                      onChange={(e) => update("phone", e.target.value)}
                    />
                  </Field>
                </FieldGrid>
                <Field label="Location">
                  <input
                    placeholder="San Francisco, CA"
                    value={resume.location}
                    onChange={(e) => update("location", e.target.value)}
                  />
                </Field>
              </div>
            )}

            {/* ── SUMMARY ── */}
            {activeSection === "summary" && (
              <div>
                <SectionHeader label="Professional Summary" />
                <Field>
                  <textarea
                    placeholder="A concise 2–3 sentence summary of your professional identity, strengths, and goals…"
                    value={resume.summary}
                    rows={6}
                    onChange={(e) => update("summary", e.target.value)}
                  />
                </Field>
              </div>
            )}

            {/* ── LINKS ── */}
            {activeSection === "links" && (
              <div>
                <SectionHeader label="Links" />
                {resume.links.map((l, i) => (
                  <div className="inline-row" key={i}>
                    <input
                      value={l}
                      placeholder="https://github.com/you"
                      onChange={(e) => {
                        const arr = [...resume.links];
                        arr[i] = e.target.value;
                        update("links", arr);
                      }}
                    />
                    <RemoveBtn
                      onClick={() => {
                        const arr = resume.links.filter((_, idx) => idx !== i);
                        update("links", arr.length ? arr : [""]);
                      }}
                    />
                  </div>
                ))}
                <AddBtn onClick={() => update("links", [...resume.links, ""])} label="Add link" />
              </div>
            )}

            {/* ── SKILLS ── */}
            {activeSection === "skills" && (
              <div>
                <SectionHeader label="Skills" />
                {resume.skills.map((s, i) => (
                  <div className="inline-row" key={i}>
                    <input
                      value={s}
                      placeholder="e.g. TypeScript"
                      onChange={(e) => {
                        const arr = [...resume.skills];
                        arr[i] = e.target.value;
                        update("skills", arr);
                      }}
                    />
                    <RemoveBtn
                      onClick={() => {
                        const arr = resume.skills.filter((_, idx) => idx !== i);
                        update("skills", arr.length ? arr : [""]);
                      }}
                    />
                  </div>
                ))}
                <AddBtn onClick={() => update("skills", [...resume.skills, ""])} label="Add skill" />
              </div>
            )}

            {/* ── EXPERIENCE ── */}
            {activeSection === "experience" && (
              <div>
                <SectionHeader label="Experience" />
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, "experience")}
                >
                  <SortableContext
                    items={resume.experience.map((e) => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {resume.experience.map((exp, i) => (
                      <SortableItem key={exp.id} id={exp.id}>
                        <div className="card">
                          <div className="card-header">
                            <span className="card-label">Position {i + 1}</span>
                            <RemoveBtn
                              onClick={() =>
                                removeArrayItem("experience", exp.id, () => ({
                                  id: uid(), company: "", role: "", start: "", end: "", current: false, bullets: [""],
                                }))
                              }
                            />
                          </div>

                          <Field label="Company">
                            <input
                              placeholder="Acme Corp"
                              value={exp.company}
                              onChange={(e) => updateArrayItem<Experience>("experience", exp.id, { company: e.target.value })}
                            />
                          </Field>
                          <Field label="Role / Title">
                            <input
                              placeholder="Senior Engineer"
                              value={exp.role}
                              onChange={(e) => updateArrayItem<Experience>("experience", exp.id, { role: e.target.value })}
                            />
                          </Field>
                          <FieldGrid>
                            <Field label="Start">
                              <input
                                type="date"
                                value={exp.start}
                                onChange={(e) => updateArrayItem<Experience>("experience", exp.id, { start: e.target.value })}
                              />
                            </Field>
                            <Field label="End">
                              <input
                                type="date"
                                value={exp.end}
                                disabled={exp.current}
                                onChange={(e) => updateArrayItem<Experience>("experience", exp.id, { end: e.target.value })}
                              />
                            </Field>
                          </FieldGrid>
                          <div className="check-row">
                            <input
                              type="checkbox"
                              id={`current-${exp.id}`}
                              checked={exp.current}
                              onChange={(e) =>
                                updateArrayItem<Experience>("experience", exp.id, {
                                  current: e.target.checked,
                                  end: e.target.checked ? "" : exp.end,
                                })
                              }
                            />
                            <label htmlFor={`current-${exp.id}`}>Current role</label>
                          </div>

                          {/* Bullets */}
                          <div className="bullet-list">
                            {exp.bullets.map((b, bi) => (
                              <div className="bullet-row" key={bi}>
                                <span className="bullet-dot">•</span>
                                <textarea
                                  value={b}
                                  placeholder="Achieved X by doing Y, resulting in Z…"
                                  rows={1}
                                  onChange={(e) => {
                                    const bullets = [...exp.bullets];
                                    bullets[bi] = e.target.value;
                                    updateArrayItem<Experience>("experience", exp.id, { bullets });
                                  }}
                                  onInput={(e) => {
                                    const t = e.currentTarget;
                                    t.style.height = "auto";
                                    t.style.height = t.scrollHeight + "px";
                                  }}
                                />
                                <RemoveBtn
                                  onClick={() => {
                                    const bullets = exp.bullets.filter((_, idx) => idx !== bi);
                                    updateArrayItem<Experience>("experience", exp.id, {
                                      bullets: bullets.length ? bullets : [""],
                                    });
                                  }}
                                />
                              </div>
                            ))}
                            <AddBtn
                              onClick={() =>
                                updateArrayItem<Experience>("experience", exp.id, {
                                  bullets: [...exp.bullets, ""],
                                })
                              }
                              label="Add bullet"
                            />
                          </div>
                        </div>
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
                <AddBtn
                  onClick={() =>
                    update("experience", [
                      ...resume.experience,
                      { id: uid(), company: "", role: "", start: "", end: "", current: false, bullets: [""] },
                    ])
                  }
                  label="Add position"
                />
              </div>
            )}

            {/* ── PROJECTS ── */}
            {activeSection === "projects" && (
              <div>
                <SectionHeader label="Projects" />
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, "projects")}
                >
                  <SortableContext
                    items={resume.projects.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {resume.projects.map((p, i) => (
                      <SortableItem key={p.id} id={p.id}>
                        <div className="card">
                          <div className="card-header">
                            <span className="card-label">Project {i + 1}</span>
                            <RemoveBtn
                              onClick={() =>
                                removeArrayItem("projects", p.id, () => ({
                                  id: uid(), title: "", description: "", url: "", start: "", end: "",
                                }))
                              }
                            />
                          </div>
                          <Field label="Title">
                            <input
                              placeholder="My Project"
                              value={p.title}
                              onChange={(e) => updateArrayItem<Project>("projects", p.id, { title: e.target.value })}
                            />
                          </Field>
                          <Field label="URL">
                            <input
                              placeholder="https://github.com/you/project"
                              value={p.url}
                              onChange={(e) => updateArrayItem<Project>("projects", p.id, { url: e.target.value })}
                            />
                          </Field>
                          <Field label="Description">
                            <textarea
                              placeholder="What it does, tech used, impact…"
                              value={p.description}
                              onChange={(e) => updateArrayItem<Project>("projects", p.id, { description: e.target.value })}
                            />
                          </Field>
                          <FieldGrid>
                            <Field label="Start">
                              <input
                                type="date"
                                value={p.start}
                                onChange={(e) => updateArrayItem<Project>("projects", p.id, { start: e.target.value })}
                              />
                            </Field>
                            <Field label="End">
                              <input
                                type="date"
                                value={p.end}
                                onChange={(e) => updateArrayItem<Project>("projects", p.id, { end: e.target.value })}
                              />
                            </Field>
                          </FieldGrid>
                        </div>
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
                <AddBtn
                  onClick={() =>
                    update("projects", [
                      ...resume.projects,
                      { id: uid(), title: "", description: "", url: "", start: "", end: "" },
                    ])
                  }
                  label="Add project"
                />
              </div>
            )}

            {/* ── EDUCATION ── */}
            {activeSection === "education" && (
              <div>
                <SectionHeader label="Education" />
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(e) => handleDragEnd(e, "education")}
                >
                  <SortableContext
                    items={resume.education.map((ed) => ed.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {resume.education.map((edu, i) => (
                      <SortableItem key={edu.id} id={edu.id}>
                        <div className="card">
                          <div className="card-header">
                            <span className="card-label">Entry {i + 1}</span>
                            <RemoveBtn
                              onClick={() =>
                                removeArrayItem("education", edu.id, () => ({
                                  id: uid(), school: "", degree: "", start: "", end: "",
                                }))
                              }
                            />
                          </div>
                          <Field label="School / Institution">
                            <input
                              placeholder="MIT"
                              value={edu.school}
                              onChange={(e) => updateArrayItem<Education>("education", edu.id, { school: e.target.value })}
                            />
                          </Field>
                          <Field label="Degree / Field of Study">
                            <input
                              placeholder="B.Sc. Computer Science"
                              value={edu.degree}
                              onChange={(e) => updateArrayItem<Education>("education", edu.id, { degree: e.target.value })}
                            />
                          </Field>
                          <FieldGrid>
                            <Field label="Start">
                              <input
                                type="date"
                                value={edu.start}
                                onChange={(e) => updateArrayItem<Education>("education", edu.id, { start: e.target.value })}
                              />
                            </Field>
                            <Field label="End">
                              <input
                                type="date"
                                value={edu.end}
                                onChange={(e) => updateArrayItem<Education>("education", edu.id, { end: e.target.value })}
                              />
                            </Field>
                          </FieldGrid>
                        </div>
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
                <AddBtn
                  onClick={() =>
                    update("education", [
                      ...resume.education,
                      { id: uid(), school: "", degree: "", start: "", end: "" },
                    ])
                  }
                  label="Add entry"
                />
              </div>
            )}

          </div>
        </aside>

        {/* ── Preview pane ── */}
        <section className="preview-pane">
          <div className="preview-inner">
            {template === "one"   && <TemplateOne   resume={resume} />}
            {template === "two"   && <TemplateTwo   resume={resume} />}
            {template === "three" && <TemplateThree resume={resume} />}
          </div>
        </section>

      </div>

      {/* ── Auth dialog (portal-style, rendered outside .app) ── */}
      {showAuth && (
        <AuthDialog
          defaultMode={authMode}
          onSuccess={handleAuthSuccess}
          onClose={() => setShowAuth(false)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast${toast.type === "err" ? " err" : ""}`}>
          {toast.msg}
        </div>
      )}
    </>
  );
}

      {/* ── Toast ── */}
      {toast && (
        <div className={`toast ${toast.type === "err" ? "err" : ""}`}>
          {toast.msg}
        </div>
      )}
    </>
  );
}