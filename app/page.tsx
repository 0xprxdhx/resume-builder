"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { User } from "@supabase/supabase-js";
import TemplateOne from "@/src/components/templates/TemplateOne";
import TemplateTwo from "@/src/components/templates/TemplateTwo";
import TemplateThree from "@/src/components/templates/TemplateThree";
import AuthDialog from "@/src/components/Auth";
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

type SectionKey =
  | "basics"
  | "summary"
  | "links"
  | "skills"
  | "experience"
  | "projects"
  | "education";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

function makeDefaultResume(): Resume {
  return {
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
}

// Fix: spread raw AFTER defaults so defaults are not overwritten by undefined values
function migrateResume(raw: Record<string, unknown>): Resume {
  const base = makeDefaultResume();
  return {
    ...base,
    ...(raw as Partial<Resume>),
    experience: ((raw.experience as Experience[] | undefined) ?? []).map((e) => ({
      id: e.id ?? uid(),
      company: e.company ?? "",
      role: e.role ?? "",
      start: e.start ?? "",
      end: e.end ?? "",
      current: e.current ?? false,
      bullets: e.bullets ?? [""],
    })),
    projects: ((raw.projects as Project[] | undefined) ?? []).map((p) => ({
      id: p.id ?? uid(),
      title: p.title ?? "",
      description: p.description ?? "",
      url: p.url ?? "",
      start: p.start ?? "",
      end: p.end ?? "",
    })),
    education: ((raw.education as Education[] | undefined) ?? []).map((ed) => ({
      id: ed.id ?? uid(),
      school: ed.school ?? "",
      degree: ed.degree ?? "",
      start: ed.start ?? "",
      end: ed.end ?? "",
    })),
  };
}

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
    <div className={`field${half ? " field--half" : ""}`}>
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
  const [user, setUser] = useState<User | null>(null);
  const [resume, setResume] = useState<Resume>(makeDefaultResume);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [activeSection, setActiveSection] = useState<SectionKey>("basics");
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

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

  // ── Auth ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Auto-load resume when user signs in
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("resumes")
        .select("data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (error) return; // no saved resume yet — keep default
      const row = data as { data: Record<string, unknown> } | null;
      if (row?.data) setResume(migrateResume(row.data));
    })();
  }, [user]);

  // ── Auth handlers ─────────────────────────────────────────────────────────

  const handleAuthSuccess = (u: User) => {
    setUser(u);
    setShowAuth(false);
    showToast("Signed in ✓");
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setResume(makeDefaultResume());
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
    const arr = (resume[field] as unknown as T[]).map((item) =>
      item.id === id ? { ...item, ...patch } : item
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update(field as any, arr as any);
  }

  function removeArrayItem(
    field: keyof Resume,
    id: string,
    fallback: () => Experience | Project | Education
  ) {
    const arr = (resume[field] as Array<{ id: string }>).filter((item) => item.id !== id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    update(field as any, (arr.length ? arr : [fallback()]) as any);
  }

  function handleDragEnd(
    event: DragEndEvent,
    field: "experience" | "projects" | "education"
  ) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const items = resume[field] as { id: string }[];
    const oldIdx = items.findIndex((x) => x.id === active.id);
    const newIdx = items.findIndex((x) => x.id === over.id);
    update(field, arrayMove(items, oldIdx, newIdx) as Resume[typeof field]);
  }

  // ── PDF — client-side via browser print ───────────────────────────────────

  const downloadPDF = () => {
    setDownloading(true);
    // Give React a tick to render, then trigger print
    setTimeout(() => {
      window.print();
      setDownloading(false);
    }, 100);
  };

  // ── Save / Load ───────────────────────────────────────────────────────────

  const saveResume = async () => {
    if (!user) {
      setAuthMode("signin");
      setShowAuth(true);
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("resumes")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert([{ user_id: user.id, data: resume as any }] as any, { onConflict: "user_id" });
      if (error) throw error;
      showToast("Saved ✓");
    } catch {
      showToast("Save failed", "err");
    } finally {
      setSaving(false);
    }
  };

  const loadResume = async () => {
    if (!user) {
      setAuthMode("signin");
      setShowAuth(true);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("resumes")
        .select("data")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      const row2 = data as { data: Record<string, unknown> } | null;
      if (row2?.data) setResume(migrateResume(row2.data));
      showToast("Loaded ✓");
    } catch {
      showToast("Could not load resume", "err");
    } finally {
      setLoading(false);
    }
  };

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

        .app {
          display: grid;
          grid-template-columns: 280px 1fr;
          grid-template-rows: 56px 1fr;
          height: 100vh;
          overflow: hidden;
        }

        /* ── Topbar ── */
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
        }
        .topbar-right { display: flex; align-items: center; gap: 6px; }

        /* ── Buttons ── */
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
          transition: background var(--t) var(--ease), border-color var(--t) var(--ease), color var(--t) var(--ease), opacity var(--t);
          white-space: nowrap;
          line-height: 1;
        }
        .btn:hover:not(:disabled) { background: var(--paper-2); border-color: var(--border-2); color: var(--ink); }
        .btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-primary { background: var(--ink); color: var(--paper); border-color: var(--ink); }
        .btn-primary:hover:not(:disabled) { background: var(--ink-2); border-color: var(--ink-2); color: var(--paper); }
        .btn-accent { background: var(--accent); color: #fff; border-color: var(--accent); }
        .btn-accent:hover:not(:disabled) { background: var(--accent-2); border-color: var(--accent-2); color: #fff; }
        .btn-ghost { border-color: transparent; color: var(--ink-3); padding: 7px 10px; }
        .btn-ghost:hover:not(:disabled) { background: var(--paper-2); border-color: transparent; color: var(--ink-2); }
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

        /* ── Sidebar ── */
        .sidebar {
          display: flex;
          flex-direction: column;
          border-right: 1px solid var(--border);
          background: var(--paper);
          overflow: hidden;
        }
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
        .sec-nav-item.active { background: var(--accent-dim); color: var(--accent); font-weight: 500; }
        .sec-icon { font-size: 12px; width: 16px; text-align: center; flex-shrink: 0; opacity: 0.7; transition: opacity var(--t); }
        .sec-nav-item.active .sec-icon { opacity: 1; }

        /* ── Template switcher ── */
        .tmpl-switcher {
          padding: 10px 12px;
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
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
        .tmpl-btn.active { background: var(--ink); color: var(--paper); border-color: var(--ink); }
        .tmpl-btn:not(.active):hover { background: var(--paper-2); color: var(--ink-2); }

        /* ── Editor body ── */
        .editor-body {
          flex: 1;
          overflow-y: auto;
          padding: 20px 16px 48px;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }

        /* ── Section header ── */
        .section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
        .section-label {
          font-family: var(--mono);
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-4);
          white-space: nowrap;
        }
        .section-rule { flex: 1; height: 1px; background: var(--border); }

        /* ── Fields ── */
        .field { margin-bottom: 10px; }
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
        .field-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 10px; }
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
        input[type="date"] { font-family: var(--mono); font-size: 11px; color: var(--ink-2); }
        input::placeholder, textarea::placeholder { color: var(--ink-4); }
        input:focus, textarea:focus, select:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 2.5px var(--accent-dim);
          background: #fff;
        }
        textarea { resize: vertical; min-height: 76px; line-height: 1.55; }
        .check-row { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
        .check-row input[type="checkbox"] { width: 14px; height: 14px; accent-color: var(--accent); cursor: pointer; flex-shrink: 0; padding: 0; }
        .check-row label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--ink-2); cursor: pointer; user-select: none; }
        .inline-row { display: flex; gap: 6px; margin-bottom: 7px; align-items: center; }

        /* ── Cards ── */
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
        .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 11px; }
        .card-label { font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-4); }
        .drag-handle {
          position: absolute; left: 8px; top: 50%; transform: translateY(-50%);
          width: 18px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          border: none; background: transparent; color: var(--ink-4);
          font-size: 14px; cursor: grab; border-radius: 3px;
          transition: color var(--t), background var(--t);
          padding: 0; line-height: 1; letter-spacing: -1px;
        }
        .drag-handle:hover { color: var(--ink-2); background: var(--paper-2); }
        .drag-handle:active { cursor: grabbing; }

        /* ── Bullets ── */
        .bullet-list { margin-top: 8px; }
        .bullet-row { display: flex; gap: 6px; margin-bottom: 6px; align-items: flex-start; }
        .bullet-dot { width: 18px; height: 34px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: var(--ink-3); flex-shrink: 0; }
        .bullet-row textarea { min-height: 0; height: 34px; resize: none; overflow: hidden; line-height: 1.45; padding: 7px 10px; }

        /* ── Add / Remove ── */
        .remove-btn {
          display: flex; align-items: center; justify-content: center;
          width: 22px; height: 22px; border-radius: 3px;
          border: 1px solid transparent; background: transparent;
          color: var(--ink-4); cursor: pointer; font-size: 11px;
          transition: background var(--t), color var(--t), border-color var(--t);
          flex-shrink: 0; padding: 0; line-height: 1;
        }
        .remove-btn:hover { background: #fce8e3; color: var(--accent); border-color: #f2c9bc; }
        .add-btn {
          display: flex; align-items: center; gap: 6px; width: 100%;
          padding: 8px 12px; border: 1px dashed var(--border-2);
          border-radius: var(--radius); background: transparent; color: var(--ink-3);
          font-family: var(--mono); font-size: 10px; letter-spacing: 0.06em;
          text-transform: uppercase; cursor: pointer;
          transition: background var(--t), color var(--t), border-color var(--t);
          margin-top: 6px;
        }
        .add-btn:hover { background: var(--paper-2); color: var(--ink); border-color: var(--ink-3); }
        .add-btn span { font-size: 14px; line-height: 1; }

        /* ── Preview pane ── */
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
          box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.08), 0 12px 40px rgba(0,0,0,0.06);
          border-radius: 2px;
          min-height: 1056px;
          overflow: hidden;
        }

        /* ── Toast ── */
        .toast {
          position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
          background: var(--ink); color: var(--paper);
          font-family: var(--mono); font-size: 11px; letter-spacing: 0.05em;
          padding: 9px 18px; border-radius: 40px; z-index: 200;
          animation: toastIn 0.24s var(--ease); white-space: nowrap; pointer-events: none;
        }
        .toast.err { background: var(--accent); }
        @keyframes toastIn {
          from { transform: translateX(-50%) translateY(10px); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0); opacity: 1; }
        }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--ink-4); }

        /* ── Print styles — hide UI, show only the resume ── */
        @media print {
          .topbar, .sidebar, .preview-pane > *:not(.preview-inner) { display: none !important; }
          .app { display: block !important; height: auto !important; overflow: visible !important; }
          .preview-pane {
            display: block !important;
            padding: 0 !important;
            background: #fff !important;
            overflow: visible !important;
          }
          .preview-inner {
            max-width: 100% !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            min-height: 0 !important;
          }
          @page { margin: 0; size: A4; }
        }
      `}</style>

      <div className="app">

        {/* ── Topbar ── */}
        <header className="topbar">
          <div className="brand">
            résumé<span className="brand-dot">·</span>studio
            <span className="brand-sub">builder</span>
          </div>
          <div className="topbar-right">
            {user ? (
              <>
                <button className="btn" onClick={loadResume} disabled={loading || saving}>
                  {loading ? <><span className="btn-spinner" /> Loading</> : "↓ Load"}
                </button>
                <button className="btn btn-primary" onClick={saveResume} disabled={saving || loading}>
                  {saving ? <><span className="btn-spinner" /> Saving</> : "↑ Save"}
                </button>
              </>
            ) : (
              <>
                <button className="btn" onClick={() => { setAuthMode("signin"); setShowAuth(true); }}>
                  Sign in
                </button>
                <button className="btn btn-primary" onClick={() => { setAuthMode("signup"); setShowAuth(true); }}>
                  Sign up
                </button>
              </>
            )}
            <button className="btn btn-accent" onClick={downloadPDF} disabled={downloading}>
              {downloading ? <><span className="btn-spinner" /> Preparing</> : "↓ PDF"}
            </button>
            {user && (
              <button className="btn btn-ghost" onClick={logout}>Sign out</button>
            )}
          </div>
        </header>

        {/* ── Sidebar ── */}
        <aside className="sidebar">
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

          <div className="tmpl-switcher">
            {(["one", "two", "three"] as const).map((t, i) => (
              <button
                key={t}
                className={`tmpl-btn${template === t ? " active" : ""}`}
                onClick={() => setTemplate(t)}
              >
                {`T0${i + 1}`}
              </button>
            ))}
          </div>

          <div className="editor-body">

            {/* BASICS */}
            {activeSection === "basics" && (
              <div>
                <SectionHeader label="Basic Info" />
                <Field label="Full Name">
                  <input placeholder="Jane Smith" value={resume.name} onChange={(e) => update("name", e.target.value)} />
                </Field>
                <Field label="Professional Title">
                  <input placeholder="Software Engineer" value={resume.title} onChange={(e) => update("title", e.target.value)} />
                </Field>
                <FieldGrid>
                  <Field label="Email">
                    <input type="email" placeholder="jane@example.com" value={resume.email} onChange={(e) => update("email", e.target.value)} />
                  </Field>
                  <Field label="Phone">
                    <input type="tel" placeholder="+1 555 000 0000" value={resume.phone} onChange={(e) => update("phone", e.target.value)} />
                  </Field>
                </FieldGrid>
                <Field label="Location">
                  <input placeholder="San Francisco, CA" value={resume.location} onChange={(e) => update("location", e.target.value)} />
                </Field>
              </div>
            )}

            {/* SUMMARY */}
            {activeSection === "summary" && (
              <div>
                <SectionHeader label="Professional Summary" />
                <Field>
                  <textarea
                    placeholder="A concise 2–3 sentence summary…"
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
                    <RemoveBtn onClick={() => {
                      const arr = resume.links.filter((_, idx) => idx !== i);
                      update("links", arr.length ? arr : [""]);
                    }} />
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
                    <RemoveBtn onClick={() => {
                      const arr = resume.skills.filter((_, idx) => idx !== i);
                      update("skills", arr.length ? arr : [""]);
                    }} />
                  </div>
                ))}
                <AddBtn onClick={() => update("skills", [...resume.skills, ""])} label="Add skill" />
              </div>
            )}

            {/* EXPERIENCE */}
            {activeSection === "experience" && (
              <div>
                <SectionHeader label="Experience" />
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, "experience")}>
                  <SortableContext items={resume.experience.map((e) => e.id)} strategy={verticalListSortingStrategy}>
                    {resume.experience.map((exp, i) => (
                      <SortableItem key={exp.id} id={exp.id}>
                        <div className="card">
                          <div className="card-header">
                            <span className="card-label">Position {i + 1}</span>
                            <RemoveBtn onClick={() => removeArrayItem("experience", exp.id, () => ({ id: uid(), company: "", role: "", start: "", end: "", current: false, bullets: [""] }))} />
                          </div>
                          <Field label="Company">
                            <input placeholder="Acme Corp" value={exp.company} onChange={(e) => updateArrayItem<Experience>("experience", exp.id, { company: e.target.value })} />
                          </Field>
                          <Field label="Role / Title">
                            <input placeholder="Senior Engineer" value={exp.role} onChange={(e) => updateArrayItem<Experience>("experience", exp.id, { role: e.target.value })} />
                          </Field>
                          <FieldGrid>
                            <Field label="Start">
                              <input type="date" value={exp.start} onChange={(e) => updateArrayItem<Experience>("experience", exp.id, { start: e.target.value })} />
                            </Field>
                            <Field label="End">
                              <input type="date" value={exp.end} disabled={exp.current} onChange={(e) => updateArrayItem<Experience>("experience", exp.id, { end: e.target.value })} />
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
                                <RemoveBtn onClick={() => {
                                  const bullets = exp.bullets.filter((_, idx) => idx !== bi);
                                  updateArrayItem<Experience>("experience", exp.id, { bullets: bullets.length ? bullets : [""] });
                                }} />
                              </div>
                            ))}
                            <AddBtn onClick={() => updateArrayItem<Experience>("experience", exp.id, { bullets: [...exp.bullets, ""] })} label="Add bullet" />
                          </div>
                        </div>
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
                <AddBtn onClick={() => update("experience", [...resume.experience, { id: uid(), company: "", role: "", start: "", end: "", current: false, bullets: [""] }])} label="Add position" />
              </div>
            )}

            {/* PROJECTS */}
            {activeSection === "projects" && (
              <div>
                <SectionHeader label="Projects" />
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, "projects")}>
                  <SortableContext items={resume.projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                    {resume.projects.map((p, i) => (
                      <SortableItem key={p.id} id={p.id}>
                        <div className="card">
                          <div className="card-header">
                            <span className="card-label">Project {i + 1}</span>
                            <RemoveBtn onClick={() => removeArrayItem("projects", p.id, () => ({ id: uid(), title: "", description: "", url: "", start: "", end: "" }))} />
                          </div>
                          <Field label="Title">
                            <input placeholder="Awesome Project" value={p.title} onChange={(e) => updateArrayItem<Project>("projects", p.id, { title: e.target.value })} />
                          </Field>
                          <Field label="URL">
                            <input placeholder="https://github.com/you/project" value={p.url} onChange={(e) => updateArrayItem<Project>("projects", p.id, { url: e.target.value })} />
                          </Field>
                          <Field label="Description">
                            <textarea placeholder="What it does, tech used, impact…" value={p.description} onChange={(e) => updateArrayItem<Project>("projects", p.id, { description: e.target.value })} />
                          </Field>
                          <FieldGrid>
                            <Field label="Start">
                              <input type="date" value={p.start} onChange={(e) => updateArrayItem<Project>("projects", p.id, { start: e.target.value })} />
                            </Field>
                            <Field label="End">
                              <input type="date" value={p.end} onChange={(e) => updateArrayItem<Project>("projects", p.id, { end: e.target.value })} />
                            </Field>
                          </FieldGrid>
                        </div>
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
                <AddBtn onClick={() => update("projects", [...resume.projects, { id: uid(), title: "", description: "", url: "", start: "", end: "" }])} label="Add project" />
              </div>
            )}

            {/* EDUCATION */}
            {activeSection === "education" && (
              <div>
                <SectionHeader label="Education" />
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, "education")}>
                  <SortableContext items={resume.education.map((ed) => ed.id)} strategy={verticalListSortingStrategy}>
                    {resume.education.map((edu, i) => (
                      <SortableItem key={edu.id} id={edu.id}>
                        <div className="card">
                          <div className="card-header">
                            <span className="card-label">Entry {i + 1}</span>
                            <RemoveBtn onClick={() => removeArrayItem("education", edu.id, () => ({ id: uid(), school: "", degree: "", start: "", end: "" }))} />
                          </div>
                          <Field label="School / Institution">
                            <input placeholder="MIT" value={edu.school} onChange={(e) => updateArrayItem<Education>("education", edu.id, { school: e.target.value })} />
                          </Field>
                          <Field label="Degree / Field of Study">
                            <input placeholder="B.Sc. Computer Science" value={edu.degree} onChange={(e) => updateArrayItem<Education>("education", edu.id, { degree: e.target.value })} />
                          </Field>
                          <FieldGrid>
                            <Field label="Start">
                              <input type="date" value={edu.start} onChange={(e) => updateArrayItem<Education>("education", edu.id, { start: e.target.value })} />
                            </Field>
                            <Field label="End">
                              <input type="date" value={edu.end} onChange={(e) => updateArrayItem<Education>("education", edu.id, { end: e.target.value })} />
                            </Field>
                          </FieldGrid>
                        </div>
                      </SortableItem>
                    ))}
                  </SortableContext>
                </DndContext>
                <AddBtn onClick={() => update("education", [...resume.education, { id: uid(), school: "", degree: "", start: "", end: "" }])} label="Add entry" />
              </div>
            )}

          </div>
        </aside>

        {/* ── Preview pane ── */}
        <section className="preview-pane">
          <div className="preview-inner" ref={previewRef}>
            {template === "one" && <TemplateOne resume={resume} />}
            {template === "two" && <TemplateTwo resume={resume} />}
            {template === "three" && <TemplateThree resume={resume} />}
          </div>
        </section>

      </div>

      {/* ── Auth dialog ── */}
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
