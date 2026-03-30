import React from "react";

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

interface Props {
  resume: Resume;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmt(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function dateRange(start: string, end: string, current: boolean): string {
  const s = fmt(start);
  const e = current ? "Present" : fmt(end);
  if (!s && !e) return "";
  if (!s) return e;
  if (!e) return s;
  return `${s} – ${e}`;
}

function clean(arr: string[]): string[] {
  return (arr ?? []).filter((x) => x.trim() !== "");
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens
// ─────────────────────────────────────────────────────────────────────────────

const FONT_SERIF  = "'Georgia', 'Times New Roman', serif";
const FONT_SANS   = "'Helvetica Neue', Arial, sans-serif";

const COLOR_BLACK  = "#1a1a1a";
const COLOR_DARK   = "#2d2d2d";
const COLOR_MID    = "#555555";
const COLOR_LIGHT  = "#888888";
const COLOR_RULE   = "#cccccc";
const COLOR_ACCENT = "#1a1a1a";   // section heading bars

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

/** Full-width centered section heading with horizontal rules on both sides */
function SectionHeading({ label }: { label: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      margin: "0 0 10px 0",
    }}>
      <div style={{ flex: 1, height: "1px", background: COLOR_RULE }} />
      <div style={{
        fontFamily: FONT_SANS,
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase" as const,
        color: COLOR_ACCENT,
        whiteSpace: "nowrap",
        padding: "0 4px",
      }}>
        {label}
      </div>
      <div style={{ flex: 1, height: "1px", background: COLOR_RULE }} />
    </div>
  );
}

/** Thin divider rule between experience entries */
function EntryDivider() {
  return (
    <div style={{
      height: "1px",
      background: "#eeeeee",
      margin: "10px 0",
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Three — Enhancv-style Centered Single Column
// ─────────────────────────────────────────────────────────────────────────────
// Layout  : single full-width column, 48px side padding
// Header  : name centred + large, title below, bullet-separated contact row
// Sections: full-width rule + centred label, content below
// Projects: 3-column card grid (mirrors Enhancv "Key Achievements")
// Skills  : inline comma-separated list
// ─────────────────────────────────────────────────────────────────────────────

export default function TemplateThree({ resume }: Props) {
  const links  = clean(resume.links);
  const skills = clean(resume.skills);

  const hasExp  = resume.experience.some((e) => e.company || e.role);
  const hasProj = resume.projects.some((p) => p.title);
  const hasEdu  = resume.education.some((e) => e.school || e.degree);

  // Contact meta items — joined with bullet separators like Enhancv
  const contactItems: string[] = [
    resume.phone,
    resume.email,
    ...links.map((l) => hostname(l)),
    resume.location,
  ].filter(Boolean);

  return (
    <div style={{
      width: "100%",
      minHeight: "1056px",
      background: "#ffffff",
      fontFamily: FONT_SERIF,
      padding: "40px 48px 48px",
      color: COLOR_BLACK,
      WebkitPrintColorAdjust: "exact",
      printColorAdjust: "exact",
    }}>

      {/* ══════════════════════════════════════════
          HEADER — centred name, title, contact row
      ══════════════════════════════════════════ */}
      <div style={{ textAlign: "center", marginBottom: "22px" }}>

        {/* Name */}
        {resume.name && (
          <div style={{
            fontFamily: FONT_SANS,
            fontSize: "28px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase" as const,
            color: COLOR_BLACK,
            lineHeight: 1.1,
            marginBottom: "5px",
          }}>
            {resume.name}
          </div>
        )}

        {/* Professional title */}
        {resume.title && (
          <div style={{
            fontFamily: FONT_SERIF,
            fontSize: "12px",
            fontStyle: "italic",
            color: COLOR_MID,
            marginBottom: "8px",
            letterSpacing: "0.02em",
          }}>
            {resume.title}
          </div>
        )}

        {/* Contact row — Phone • Email • LinkedIn • Location */}
        {contactItems.length > 0 && (
          <div style={{
            fontFamily: FONT_SANS,
            fontSize: "10px",
            color: COLOR_LIGHT,
            letterSpacing: "0.03em",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "0",
          }}>
            {contactItems.map((item, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <span style={{ margin: "0 7px", color: COLOR_RULE }}>•</span>
                )}
                <span>{item}</span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          SUMMARY
      ══════════════════════════════════════════ */}
      {resume.summary && (
        <div style={{ marginBottom: "18px" }}>
          <SectionHeading label="Summary" />
          <p style={{
            fontFamily: FONT_SERIF,
            fontSize: "11px",
            color: COLOR_DARK,
            lineHeight: 1.75,
            margin: 0,
            textAlign: "justify",
          }}>
            {resume.summary}
          </p>
        </div>
      )}

      {/* ══════════════════════════════════════════
          EXPERIENCE
      ══════════════════════════════════════════ */}
      {hasExp && (
        <div style={{ marginBottom: "18px" }}>
          <SectionHeading label="Experience" />

          {resume.experience
            .filter((e) => e.company || e.role)
            .map((exp, idx, arr) => (
              <div key={exp.id}>
                {/* Row 1: Company + Location(right) */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "1px",
                }}>
                  <div style={{
                    fontFamily: FONT_SANS,
                    fontSize: "12px",
                    fontWeight: 700,
                    color: COLOR_BLACK,
                  }}>
                    {exp.company}
                  </div>
                  <div style={{
                    fontFamily: FONT_SANS,
                    fontSize: "10px",
                    color: COLOR_LIGHT,
                    whiteSpace: "nowrap",
                    marginLeft: "12px",
                  }}>
                    {resume.location || ""}
                  </div>
                </div>

                {/* Row 2: Role (italic) + Date range (right) */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "5px",
                }}>
                  <div style={{
                    fontFamily: FONT_SERIF,
                    fontSize: "11px",
                    fontStyle: "italic",
                    color: COLOR_MID,
                  }}>
                    {exp.role}
                  </div>
                  <div style={{
                    fontFamily: FONT_SANS,
                    fontSize: "10px",
                    color: COLOR_LIGHT,
                    whiteSpace: "nowrap",
                    marginLeft: "12px",
                  }}>
                    {dateRange(exp.start, exp.end, exp.current)}
                  </div>
                </div>

                {/* Bullet points */}
                {clean(exp.bullets).length > 0 && (
                  <ul style={{
                    margin: "0 0 4px 0",
                    padding: "0 0 0 16px",
                    listStyleType: "disc",
                  }}>
                    {clean(exp.bullets).map((b, bi) => (
                      <li key={bi} style={{
                        fontFamily: FONT_SERIF,
                        fontSize: "11px",
                        color: COLOR_DARK,
                        lineHeight: 1.65,
                        marginBottom: "2px",
                      }}>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Thin rule between entries, not after the last */}
                {idx < arr.length - 1 && <EntryDivider />}
              </div>
            ))}
        </div>
      )}

      {/* ══════════════════════════════════════════
          EDUCATION
      ══════════════════════════════════════════ */}
      {hasEdu && (
        <div style={{ marginBottom: "18px" }}>
          <SectionHeading label="Education" />

          {resume.education
            .filter((e) => e.school || e.degree)
            .map((edu, idx, arr) => (
              <div key={edu.id}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  marginBottom: "1px",
                }}>
                  <div style={{
                    fontFamily: FONT_SANS,
                    fontSize: "12px",
                    fontWeight: 700,
                    color: COLOR_BLACK,
                  }}>
                    {edu.school}
                  </div>
                  <div style={{
                    fontFamily: FONT_SANS,
                    fontSize: "10px",
                    color: COLOR_LIGHT,
                    whiteSpace: "nowrap",
                    marginLeft: "12px",
                  }}>
                    {dateRange(edu.start, edu.end, false)}
                  </div>
                </div>
                {edu.degree && (
                  <div style={{
                    fontFamily: FONT_SERIF,
                    fontSize: "11px",
                    fontStyle: "italic",
                    color: COLOR_MID,
                    marginBottom: "4px",
                  }}>
                    {edu.degree}
                  </div>
                )}
                {idx < arr.length - 1 && <EntryDivider />}
              </div>
            ))}
        </div>
      )}

      {/* ══════════════════════════════════════════
          PROJECTS — 3-column card grid
          mirrors Enhancv "Key Achievements" layout
      ══════════════════════════════════════════ */}
      {hasProj && (
        <div style={{ marginBottom: "18px" }}>
          <SectionHeading label="Key Projects" />

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "10px",
          }}>
            {resume.projects.filter((p) => p.title).map((p) => (
              <div key={p.id} style={{
                border: "1px solid #e0e0e0",
                borderRadius: "3px",
                padding: "10px 12px",
                background: "#fafafa",
              }}>
                {/* Title + date */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "4px",
                  gap: "6px",
                }}>
                  <div style={{
                    fontFamily: FONT_SANS,
                    fontSize: "10.5px",
                    fontWeight: 700,
                    color: COLOR_BLACK,
                    lineHeight: 1.3,
                  }}>
                    {p.title}
                  </div>
                  {(p.start || p.end) && (
                    <div style={{
                      fontFamily: FONT_SANS,
                      fontSize: "8.5px",
                      color: COLOR_LIGHT,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}>
                      {dateRange(p.start, p.end, false)}
                    </div>
                  )}
                </div>

                {/* URL */}
                {p.url && (
                  <div style={{
                    fontFamily: FONT_SANS,
                    fontSize: "8.5px",
                    color: COLOR_LIGHT,
                    marginBottom: "5px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {hostname(p.url)}
                  </div>
                )}

                {/* Description */}
                {p.description && (
                  <div style={{
                    fontFamily: FONT_SERIF,
                    fontSize: "10px",
                    color: COLOR_MID,
                    lineHeight: 1.6,
                  }}>
                    {p.description}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          SKILLS — inline pill row
      ══════════════════════════════════════════ */}
      {skills.length > 0 && (
        <div style={{ marginBottom: "18px" }}>
          <SectionHeading label="Skills" />

          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "6px",
          }}>
            {skills.map((s, i) => (
              <span key={i} style={{
                fontFamily: FONT_SANS,
                fontSize: "10px",
                color: COLOR_DARK,
                background: "#f2f2f2",
                border: "1px solid #e0e0e0",
                borderRadius: "2px",
                padding: "3px 9px",
                lineHeight: 1.4,
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}