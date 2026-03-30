import { NextResponse } from "next/server";
import puppeteer from "puppeteer";

// ─────────────────────────────────────────────────────────────────────────────
// Types — kept in sync with page.tsx
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

interface ResumeBody {
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
  /** Which template to render — defaults to "one" */
  template?: "one" | "two" | "three";
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Escape user-supplied strings so they can't break the HTML document */
function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Format a YYYY-MM-DD date string → "Jan 2024" */
function fmt(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/** Build a "Jan 2022 – Present" range string */
function dateRange(start: string, end: string, current: boolean): string {
  const s = fmt(start);
  const e = current ? "Present" : fmt(end);
  if (!s && !e) return "";
  if (!s) return e;
  if (!e) return s;
  return `${s} – ${e}`;
}

/** Strip empty strings from arrays */
function clean(arr: string[]): string[] {
  return (arr ?? []).filter((x) => x.trim() !== "");
}

/** Extract a display-friendly hostname from a URL */
function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Extract initials (up to 2) from a full name */
function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared font import
// Puppeteer loads the page in a real Chromium instance, so Google Fonts
// @import works just like in a browser — fonts are fetched and rendered.
// ─────────────────────────────────────────────────────────────────────────────

const FONT_IMPORT = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&family=Outfit:wght@300;400;500;600&display=swap');
`;

const BASE_RESET = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { background: #fff; }
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
`;

// ─────────────────────────────────────────────────────────────────────────────
// Template One HTML — Editorial Two-Column
// Dark sidebar (#0f0f1a) + white right column
// ─────────────────────────────────────────────────────────────────────────────

function buildTemplateOne(r: ResumeBody): string {
  const links  = clean(r.links);
  const skills = clean(r.skills);

  const hasExp  = r.experience.some((e) => e.company || e.role);
  const hasProj = r.projects.some((p) => p.title);
  const hasEdu  = r.education.some((e) => e.school || e.degree);

  // ── Sidebar sections ───────────────────────────────────────────────────────

  const avatarHTML = r.name ? `
    <div style="
      width:64px; height:64px; border-radius:50%;
      background:linear-gradient(135deg,#c8ff00 0%,#00c8ff 100%);
      display:flex; align-items:center; justify-content:center;
      font-family:'Syne',sans-serif; font-size:22px; font-weight:800;
      color:#0a0a0f; flex-shrink:0;
    ">${esc(initials(r.name))}</div>
  ` : "";

  const contactHTML = `
    <div>
      <div class="side-label">Contact</div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${r.email ? `
          <div>
            <div class="meta-key">Email</div>
            <div class="meta-val">${esc(r.email)}</div>
          </div>` : ""}
        ${r.phone ? `
          <div>
            <div class="meta-key">Phone</div>
            <div class="meta-val">${esc(r.phone)}</div>
          </div>` : ""}
        ${r.location ? `
          <div>
            <div class="meta-key">Location</div>
            <div class="meta-val">${esc(r.location)}</div>
          </div>` : ""}
      </div>
    </div>
  `;

  const linksHTML = links.length ? `
    <div>
      <div class="side-label">Links</div>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${links.map((l) => `
          <a href="${esc(l)}" style="
            font-size:10px; color:#c8ff00; text-decoration:none;
            word-break:break-all; line-height:1.4;
            font-family:'Space Mono',monospace;
          ">${esc(hostname(l))}</a>
        `).join("")}
      </div>
    </div>
  ` : "";

  const skillsHTML = skills.length ? `
    <div>
      <div class="side-label">Skills</div>
      <div style="display:flex;flex-wrap:wrap;gap:5px;">
        ${skills.map((s) => `
          <span style="
            font-size:9px; font-family:'Space Mono',monospace; font-weight:700;
            color:#0a0a0f; background:#c8ff00; padding:3px 8px;
            border-radius:3px; letter-spacing:0.04em; line-height:1.4;
          ">${esc(s)}</span>
        `).join("")}
      </div>
    </div>
  ` : "";

  const eduSideHTML = hasEdu ? `
    <div>
      <div class="side-label">Education</div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${r.education.filter((e) => e.school || e.degree).map((edu) => `
          <div>
            <div style="
              font-size:11px; font-weight:600; color:#f0f0ff;
              font-family:'Syne',sans-serif; line-height:1.35; margin-bottom:2px;
            ">${esc(edu.school)}</div>
            ${edu.degree ? `
              <div style="font-size:10px;color:#a0a0b8;line-height:1.4;margin-bottom:2px;">
                ${esc(edu.degree)}
              </div>` : ""}
            ${(edu.start || edu.end) ? `
              <div style="font-size:9px;color:#5a5a7a;font-family:'Space Mono',monospace;">
                ${esc(dateRange(edu.start, edu.end, false))}
              </div>` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  // ── Main column sections ────────────────────────────────────────────────────

  const summaryHTML = r.summary ? `
    <div>
      <div class="main-label">Profile</div>
      <p style="font-size:12px;color:#333;line-height:1.7;margin:0;">${esc(r.summary)}</p>
    </div>
  ` : "";

  const expHTML = hasExp ? `
    <div>
      <div class="main-label">Experience</div>
      <div style="display:flex;flex-direction:column;gap:20px;">
        ${r.experience.filter((e) => e.company || e.role).map((exp) => `
          <div style="position:relative;padding-left:14px;">
            <div style="
              position:absolute; left:0; top:3px;
              width:4px; height:4px; border-radius:50%;
              background:#c8ff00; border:1px solid #0a0a0f;
            "></div>
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2px;">
              <div>
                <div style="
                  font-size:13px; font-weight:700; color:#0a0a0f;
                  font-family:'Syne',sans-serif; letter-spacing:-0.2px;
                ">${esc(exp.role)}</div>
                <div style="
                  font-size:11px; color:#555;
                  font-family:'Space Mono',monospace; letter-spacing:0.04em;
                ">${esc(exp.company)}</div>
              </div>
              ${(exp.start || exp.end || exp.current) ? `
                <div style="
                  font-size:9px; font-family:'Space Mono',monospace; color:#888;
                  white-space:nowrap; margin-left:12px; margin-top:2px;
                  background:#f5f5f5; padding:2px 7px; border-radius:3px;
                ">${esc(dateRange(exp.start, exp.end, exp.current))}</div>
              ` : ""}
            </div>
            ${clean(exp.bullets ?? []).length ? `
              <ul style="margin:6px 0 0;padding:0;list-style:none;">
                ${clean(exp.bullets).map((b) => `
                  <li style="
                    font-size:11px; color:#333; line-height:1.6;
                    margin-bottom:3px; padding-left:12px; position:relative;
                  ">
                    <span style="
                      position:absolute; left:0;
                      color:#c8ff00; font-weight:700; font-size:10px;
                    ">›</span>
                    ${esc(b)}
                  </li>
                `).join("")}
              </ul>
            ` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  const projHTML = hasProj ? `
    <div>
      <div class="main-label">Projects</div>
      <div style="display:flex;flex-direction:column;gap:14px;">
        ${r.projects.filter((p) => p.title).map((p) => `
          <div style="border-left:2px solid #c8ff00;padding-left:12px;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <div style="
                font-size:12px; font-weight:700; color:#0a0a0f;
                font-family:'Syne',sans-serif;
              ">
                ${esc(p.title)}
                ${p.url ? `
                  <a href="${esc(p.url)}" style="
                    font-size:9px; font-family:'Space Mono',monospace;
                    color:#888; font-weight:400; margin-left:8px; text-decoration:none;
                  ">${esc(hostname(p.url))}</a>
                ` : ""}
              </div>
              ${(p.start || p.end) ? `
                <div style="
                  font-size:9px; font-family:'Space Mono',monospace;
                  color:#888; white-space:nowrap; margin-left:12px;
                ">${esc(dateRange(p.start, p.end, false))}</div>
              ` : ""}
            </div>
            ${p.description ? `
              <p style="font-size:11px;color:#444;line-height:1.6;margin:4px 0 0;">
                ${esc(p.description)}
              </p>
            ` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <style>
    ${FONT_IMPORT}
    ${BASE_RESET}

    body {
      font-family: 'Outfit', sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .wrapper {
      display: flex;
      width: 100%;
      min-height: 1056px;
    }

    /* ── Sidebar ── */
    .sidebar {
      width: 220px;
      flex-shrink: 0;
      background: #0f0f1a;
      padding: 36px 22px;
      display: flex;
      flex-direction: column;
      gap: 28px;
    }

    .side-label {
      font-family: 'Space Mono', monospace;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #c8ff00;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 1px solid rgba(200,255,0,0.3);
    }

    .meta-key {
      font-size: 8px;
      font-family: 'Space Mono', monospace;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #5a5a7a;
      margin-bottom: 1px;
    }

    .meta-val {
      font-size: 10px;
      color: #c0c0d8;
      line-height: 1.4;
      word-break: break-all;
    }

    /* ── Main column ── */
    .main {
      flex: 1;
      padding: 36px 36px 36px 32px;
      display: flex;
      flex-direction: column;
      gap: 28px;
      background: #fff;
    }

    .main-label {
      font-family: 'Space Mono', monospace;
      font-size: 8px;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 12px;
      padding-bottom: 5px;
      border-bottom: 1.5px solid #111;
    }
  </style>
</head>
<body>
  <div class="wrapper">

    <!-- Sidebar -->
    <div class="sidebar">
      ${avatarHTML}
      ${contactHTML}
      ${linksHTML}
      ${skillsHTML}
      ${eduSideHTML}
    </div>

    <!-- Main column -->
    <div class="main">

      <!-- Header -->
      <div style="border-bottom:3px solid #111;padding-bottom:18px;">
        ${r.name ? `
          <div style="
            font-family:'Syne',sans-serif; font-size:34px; font-weight:800;
            color:#0a0a0f; letter-spacing:-1px; line-height:1.05; margin-bottom:6px;
          ">${esc(r.name)}</div>
        ` : ""}
        ${r.title ? `
          <div style="
            font-family:'Space Mono',monospace; font-size:11px; font-weight:700;
            color:#555; letter-spacing:0.12em; text-transform:uppercase;
          ">${esc(r.title)}</div>
        ` : ""}
      </div>

      ${summaryHTML}
      ${expHTML}
      ${projHTML}

    </div>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Two HTML — Brutalist Single-Column
// ─────────────────────────────────────────────────────────────────────────────

function buildTemplateTwo(r: ResumeBody): string {
  const links  = clean(r.links);
  const skills = clean(r.skills);

  const hasExp  = r.experience.some((e) => e.company || e.role);
  const hasProj = r.projects.some((p) => p.title);
  const hasEdu  = r.education.some((e) => e.school || e.degree);

  const metaItems = [r.email, r.phone, r.location].filter(Boolean);

  const summaryHTML = r.summary ? `
    <p style="
      font-size:13px; color:#222; line-height:1.75; margin:0 0 28px;
      border-left:3px solid #c8ff00; padding-left:16px; font-style:italic;
    ">${esc(r.summary)}</p>
  ` : "";

  const expHTML = hasExp ? `
    <div style="margin-bottom:28px;">
      <div class="section-header">
        <div class="section-marker"></div>
        <div class="section-label">Experience</div>
        <div class="section-rule"></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:20px;">
        ${r.experience.filter((e) => e.company || e.role).map((exp) => `
          <div>
            <div style="display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start;margin-bottom:4px;">
              <div>
                <span style="
                  font-family:'Syne',sans-serif; font-size:14px; font-weight:700;
                  color:#0a0a0f; letter-spacing:-0.3px;
                ">${esc(exp.role)}</span>
                ${exp.company ? `
                  <span style="
                    font-family:'Space Mono',monospace; font-size:10px;
                    color:#666; margin-left:10px; font-weight:400;
                  ">@ ${esc(exp.company)}</span>
                ` : ""}
              </div>
              ${(exp.start || exp.end || exp.current) ? `
                <div style="
                  font-family:'Space Mono',monospace; font-size:9px;
                  color:#fff; background:#0a0a0f; padding:2px 8px;
                  border-radius:2px; white-space:nowrap; letter-spacing:0.04em; margin-top:2px;
                ">${esc(dateRange(exp.start, exp.end, exp.current))}</div>
              ` : ""}
            </div>
            ${clean(exp.bullets ?? []).length ? `
              <ul style="margin:6px 0 0;padding:0;list-style:none;">
                ${clean(exp.bullets).map((b) => `
                  <li style="
                    display:grid; grid-template-columns:12px 1fr; gap:6px;
                    font-size:11.5px; color:#333; line-height:1.65; margin-bottom:3px;
                  ">
                    <span style="color:#c8ff00;font-weight:900;font-size:14px;line-height:1.4;">—</span>
                    <span>${esc(b)}</span>
                  </li>
                `).join("")}
              </ul>
            ` : ""}
            <div style="height:1px;background:#f0f0f0;margin-top:16px;"></div>
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  const projHTML = hasProj ? `
    <div style="margin-bottom:28px;">
      <div class="section-header">
        <div class="section-marker"></div>
        <div class="section-label">Projects</div>
        <div class="section-rule"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
        ${r.projects.filter((p) => p.title).map((p) => `
          <div style="
            border:1px solid #e0e0e0; border-top:3px solid #0a0a0f;
            padding:14px; background:#fafafa;
          ">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
              <div style="
                font-family:'Syne',sans-serif; font-size:12px; font-weight:700;
                color:#0a0a0f; letter-spacing:-0.2px;
              ">${esc(p.title)}</div>
              ${(p.start || p.end) ? `
                <div style="
                  font-family:'Space Mono',monospace; font-size:8px;
                  color:#999; white-space:nowrap; margin-left:8px;
                ">${esc(dateRange(p.start, p.end, false))}</div>
              ` : ""}
            </div>
            ${p.url ? `
              <a href="${esc(p.url)}" style="
                font-family:'Space Mono',monospace; font-size:8px; color:#666;
                text-decoration:none; display:block; margin-bottom:6px;
                border-bottom:1px solid #c8ff00; width:fit-content; padding-bottom:1px;
              ">${esc(hostname(p.url))}</a>
            ` : ""}
            ${p.description ? `
              <p style="font-size:10.5px;color:#444;line-height:1.6;margin:0;">${esc(p.description)}</p>
            ` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  const eduSkillsGrid = (hasEdu || skills.length) ? `
    <div style="display:grid;grid-template-columns:${hasEdu && skills.length ? "1fr 1fr" : "1fr"};gap:32px;">

      ${hasEdu ? `
        <div>
          <div class="section-header">
            <div class="section-marker"></div>
            <div class="section-label">Education</div>
            <div class="section-rule"></div>
          </div>
          <div style="display:flex;flex-direction:column;gap:14px;">
            ${r.education.filter((e) => e.school || e.degree).map((edu) => `
              <div>
                <div style="display:flex;justify-content:space-between;align-items:flex-start;">
                  <div style="
                    font-family:'Syne',sans-serif; font-size:13px; font-weight:700;
                    color:#0a0a0f; letter-spacing:-0.2px;
                  ">${esc(edu.school)}</div>
                  ${(edu.start || edu.end) ? `
                    <div style="
                      font-family:'Space Mono',monospace; font-size:8px;
                      color:#999; white-space:nowrap; margin-left:8px;
                    ">${esc(dateRange(edu.start, edu.end, false))}</div>
                  ` : ""}
                </div>
                ${edu.degree ? `
                  <div style="font-size:11px;color:#555;margin-top:2px;">${esc(edu.degree)}</div>
                ` : ""}
              </div>
            `).join("")}
          </div>
        </div>
      ` : ""}

      ${skills.length ? `
        <div>
          <div class="section-header">
            <div class="section-marker"></div>
            <div class="section-label">Skills</div>
            <div class="section-rule"></div>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;">
            ${skills.map((s, i) => `
              <span style="
                font-size:10px; font-family:'Space Mono',monospace; font-weight:700;
                color:#0a0a0f; border:1.5px solid #0a0a0f; padding:4px 10px;
                border-radius:2px; letter-spacing:0.05em; line-height:1.4;
                ${i % 3 === 0 ? "background:#c8ff00;border-color:#c8ff00;" : "background:transparent;"}
              ">${esc(s)}</span>
            `).join("")}
          </div>
        </div>
      ` : ""}

    </div>
  ` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <style>
    ${FONT_IMPORT}
    ${BASE_RESET}

    body {
      font-family: 'Outfit', sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      width: 100%;
      min-height: 1056px;
      background: #fff;
      padding: 52px 56px;
    }

    .section-header {
      display: flex;
      align-items: center;
      margin-bottom: 14px;
    }

    .section-marker {
      width: 10px;
      height: 14px;
      background: #0a0a0f;
      margin-right: 10px;
      flex-shrink: 0;
    }

    .section-label {
      font-family: 'Space Mono', monospace;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #0a0a0f;
    }

    .section-rule {
      flex: 1;
      height: 1px;
      background: #0a0a0f;
      margin-left: 12px;
    }
  </style>
</head>
<body>
  <div class="page">

    <!-- Header -->
    <div style="margin-bottom:36px;">
      ${r.name ? `
        <div style="
          font-family:'Syne',sans-serif; font-size:48px; font-weight:800;
          color:#0a0a0f; letter-spacing:-2px; line-height:0.95; margin-bottom:10px;
        ">${esc(r.name)}</div>
      ` : ""}

      <div style="
        display:flex; align-items:center; flex-wrap:wrap;
        border-top:3px solid #0a0a0f; border-bottom:1px solid #ddd;
        padding:8px 0; margin-top:10px;
      ">
        ${r.title ? `
          <div style="
            font-family:'Space Mono',monospace; font-size:10px; font-weight:700;
            letter-spacing:0.14em; text-transform:uppercase; color:#0a0a0f;
            padding-right:16px; margin-right:16px; border-right:1px solid #ccc;
          ">${esc(r.title)}</div>
        ` : ""}

        ${metaItems.map((item, i) => `
          <span style="
            font-family:'Space Mono',monospace; font-size:9px; color:#666;
            ${i < metaItems.length - 1 ? "padding-right:16px;margin-right:16px;border-right:1px solid #ddd;" : ""}
          ">${esc(item!)}</span>
        `).join("")}

        ${links.length ? `
          <div style="width:1px;height:12px;background:#ddd;margin:0 16px;"></div>
          ${links.map((l) => `
            <a href="${esc(l)}" style="
              font-family:'Space Mono',monospace; font-size:9px; color:#0a0a0f;
              text-decoration:none; margin-right:14px;
              border-bottom:1px solid #c8ff00; padding-bottom:1px;
            ">${esc(hostname(l))}</a>
          `).join("")}
        ` : ""}
      </div>
    </div>

    ${summaryHTML}
    ${expHTML}
    ${projHTML}
    ${eduSkillsGrid}

  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route handler
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Template Three HTML — Enhancv-style Centered Single Column
// ─────────────────────────────────────────────────────────────────────────────

function buildTemplateThree(r: ResumeBody): string {
  const links  = clean(r.links);
  const skills = clean(r.skills);

  const hasExp  = r.experience.some((e) => e.company || e.role);
  const hasProj = r.projects.some((p) => p.title);
  const hasEdu  = r.education.some((e) => e.school || e.degree);

  const contactItems = [r.phone, r.email, ...links.map(hostname), r.location].filter(Boolean);

  const sectionHead = (label: string) => `
    <div style="display:flex;align-items:center;gap:10px;margin:0 0 10px 0;">
      <div style="flex:1;height:1px;background:#cccccc;"></div>
      <div style="
        font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; font-weight:700;
        letter-spacing:0.18em; text-transform:uppercase; color:#1a1a1a;
        white-space:nowrap; padding:0 4px;
      ">${esc(label)}</div>
      <div style="flex:1;height:1px;background:#cccccc;"></div>
    </div>
  `;

  const entryDivider = `<div style="height:1px;background:#eeeeee;margin:10px 0;"></div>`;

  const summaryHTML = r.summary ? `
    <div style="margin-bottom:18px;">
      ${sectionHead("Summary")}
      <p style="
        font-family:Georgia,'Times New Roman',serif; font-size:11px;
        color:#2d2d2d; line-height:1.75; margin:0; text-align:justify;
      ">${esc(r.summary)}</p>
    </div>
  ` : "";

  const expHTML = hasExp ? `
    <div style="margin-bottom:18px;">
      ${sectionHead("Experience")}
      ${r.experience.filter((e) => e.company || e.role).map((exp, idx, arr) => `
        <div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1px;">
            <div style="
              font-family:'Helvetica Neue',Arial,sans-serif; font-size:12px;
              font-weight:700; color:#1a1a1a;
            ">${esc(exp.company)}</div>
            <div style="
              font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px;
              color:#888888; white-space:nowrap; margin-left:12px;
            ">${esc(r.location ?? "")}</div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px;">
            <div style="
              font-family:Georgia,'Times New Roman',serif; font-size:11px;
              font-style:italic; color:#555555;
            ">${esc(exp.role)}</div>
            <div style="
              font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px;
              color:#888888; white-space:nowrap; margin-left:12px;
            ">${esc(dateRange(exp.start, exp.end, exp.current))}</div>
          </div>
          ${clean(exp.bullets ?? []).length ? `
            <ul style="margin:0 0 4px 0;padding:0 0 0 16px;list-style-type:disc;">
              ${clean(exp.bullets).map((b) => `
                <li style="
                  font-family:Georgia,'Times New Roman',serif; font-size:11px;
                  color:#2d2d2d; line-height:1.65; margin-bottom:2px;
                ">${esc(b)}</li>
              `).join("")}
            </ul>
          ` : ""}
          ${idx < arr.length - 1 ? entryDivider : ""}
        </div>
      `).join("")}
    </div>
  ` : "";

  const eduHTML = hasEdu ? `
    <div style="margin-bottom:18px;">
      ${sectionHead("Education")}
      ${r.education.filter((e) => e.school || e.degree).map((edu, idx, arr) => `
        <div>
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:1px;">
            <div style="
              font-family:'Helvetica Neue',Arial,sans-serif; font-size:12px;
              font-weight:700; color:#1a1a1a;
            ">${esc(edu.school)}</div>
            <div style="
              font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px;
              color:#888888; white-space:nowrap; margin-left:12px;
            ">${esc(dateRange(edu.start, edu.end, false))}</div>
          </div>
          ${edu.degree ? `
            <div style="
              font-family:Georgia,'Times New Roman',serif; font-size:11px;
              font-style:italic; color:#555555; margin-bottom:4px;
            ">${esc(edu.degree)}</div>
          ` : ""}
          ${idx < arr.length - 1 ? entryDivider : ""}
        </div>
      `).join("")}
    </div>
  ` : "";

  const projHTML = hasProj ? `
    <div style="margin-bottom:18px;">
      ${sectionHead("Key Projects")}
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        ${r.projects.filter((p) => p.title).map((p) => `
          <div style="
            border:1px solid #e0e0e0; border-radius:3px;
            padding:10px 12px; background:#fafafa;
          ">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;gap:6px;">
              <div style="
                font-family:'Helvetica Neue',Arial,sans-serif; font-size:10.5px;
                font-weight:700; color:#1a1a1a; line-height:1.3;
              ">${esc(p.title)}</div>
              ${(p.start || p.end) ? `
                <div style="
                  font-family:'Helvetica Neue',Arial,sans-serif; font-size:8.5px;
                  color:#888888; white-space:nowrap; flex-shrink:0;
                ">${esc(dateRange(p.start, p.end, false))}</div>
              ` : ""}
            </div>
            ${p.url ? `
              <div style="
                font-family:'Helvetica Neue',Arial,sans-serif; font-size:8.5px;
                color:#888888; margin-bottom:5px;
                overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
              ">${esc(hostname(p.url))}</div>
            ` : ""}
            ${p.description ? `
              <div style="
                font-family:Georgia,'Times New Roman',serif; font-size:10px;
                color:#555555; line-height:1.6;
              ">${esc(p.description)}</div>
            ` : ""}
          </div>
        `).join("")}
      </div>
    </div>
  ` : "";

  const skillsHTML = skills.length ? `
    <div style="margin-bottom:18px;">
      ${sectionHead("Skills")}
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${skills.map((s) => `
          <span style="
            font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px;
            color:#2d2d2d; background:#f2f2f2; border:1px solid #e0e0e0;
            border-radius:2px; padding:3px 9px; line-height:1.4;
          ">${esc(s)}</span>
        `).join("")}
      </div>
    </div>
  ` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { background: #fff; }
    body {
      font-family: Georgia, 'Times New Roman', serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  </style>
</head>
<body>
  <div style="width:100%;min-height:1056px;background:#fff;padding:40px 48px 48px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:22px;">
      ${r.name ? `
        <div style="
          font-family:'Helvetica Neue',Arial,sans-serif; font-size:28px; font-weight:700;
          letter-spacing:0.08em; text-transform:uppercase; color:#1a1a1a;
          line-height:1.1; margin-bottom:5px;
        ">${esc(r.name)}</div>
      ` : ""}
      ${r.title ? `
        <div style="
          font-family:Georgia,'Times New Roman',serif; font-size:12px;
          font-style:italic; color:#555555; margin-bottom:8px; letter-spacing:0.02em;
        ">${esc(r.title)}</div>
      ` : ""}
      ${contactItems.length ? `
        <div style="
          font-family:'Helvetica Neue',Arial,sans-serif; font-size:10px; color:#888888;
          letter-spacing:0.03em; display:flex; align-items:center;
          justify-content:center; flex-wrap:wrap; gap:0;
        ">
          ${contactItems.map((item, i) => `
            ${i > 0 ? `<span style="margin:0 7px;color:#cccccc;">•</span>` : ""}
            <span>${esc(item!)}</span>
          `).join("")}
        </div>
      ` : ""}
    </div>

    ${summaryHTML}
    ${expHTML}
    ${eduHTML}
    ${projHTML}
    ${skillsHTML}

  </div>
</body>
</html>`;
}

export async function POST(req: Request) {
  // ── Parse body ─────────────────────────────────────────────────────────────

  let body: ResumeBody;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // ── Validate required fields ───────────────────────────────────────────────

  const required: (keyof ResumeBody)[] = [
    "name", "email", "phone",
    "links", "skills", "experience", "projects", "education",
  ];

  for (const field of required) {
    if (body[field] === undefined || body[field] === null) {
      return NextResponse.json(
        { error: `Missing required field: ${field}` },
        { status: 400 }
      );
    }
  }

  // ── Build HTML ─────────────────────────────────────────────────────────────

  const template = body.template ?? "one";
  const html =
    template === "two"   ? buildTemplateTwo(body)   :
    template === "three" ? buildTemplateThree(body) :
                           buildTemplateOne(body);

  // ── Launch Puppeteer and generate PDF ──────────────────────────────────────

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",   // avoids crashes in Docker/serverless
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    // Set viewport to A4 width at 96 DPI (794px ≈ 210mm)
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });

    await page.setContent(html, {
      // "networkidle0" waits for Google Fonts to finish loading —
      // essential for correct font rendering in the PDF.
      waitUntil: "networkidle0",
      timeout: 30_000,
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,     // required for coloured backgrounds (dark sidebar)
      margin: { top: "0", bottom: "0", left: "0", right: "0" },
      preferCSSPageSize: false,
    });

    const filename = `${(body.name || "resume").replace(/\s+/g, "-").toLowerCase()}.pdf`;

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });

  } catch (err) {
    console.error("[pdf/route] Generation failed:", err);
    return NextResponse.json(
      { error: "PDF generation failed. Please try again." },
      { status: 500 }
    );
  } finally {
    // Always close the browser — even if PDF generation throws
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}