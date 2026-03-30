import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types (mirrored from page.tsx)
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
  return `${s} — ${e}`;
}

function clean(arr: string[]): string[] {
  return arr.filter((x) => x.trim() !== "");
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "28px" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0",
        marginBottom: "14px",
      }}>
        {/* Coloured marker block */}
        <div style={{
          width: "10px",
          height: "14px",
          background: "#0a0a0f",
          marginRight: "10px",
          flexShrink: 0,
        }} />
        <div style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "9px",
          fontWeight: 700,
          letterSpacing: "0.22em",
          textTransform: "uppercase" as const,
          color: "#0a0a0f",
          flex: 1,
        }}>
          {label}
        </div>
        <div style={{ flex: 1, height: "1px", background: "#0a0a0f", marginLeft: "12px" }} />
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Template Two — Brutalist Single-Column
// ─────────────────────────────────────────────────────────────────────────────
// Layout: full-width single column, generous margins, stark typographic rules
// Aesthetic: Swiss-style brutalist — tight blacks, zero decoration,
//            one lime accent used sparingly for maximum impact
// ─────────────────────────────────────────────────────────────────────────────

export default function TemplateTwo({ resume }: Props) {
  const links   = clean(resume.links);
  const skills  = clean(resume.skills);

  const hasExp  = resume.experience.some(e => e.company || e.role);
  const hasProj = resume.projects.some(p => p.title);
  const hasEdu  = resume.education.some(e => e.school || e.degree);

  return (
    <div style={{
      width: "100%",
      minHeight: "1056px",
      background: "#fff",
      fontFamily: "'Outfit', sans-serif",
      padding: "52px 56px",
      WebkitPrintColorAdjust: "exact",
      printColorAdjust: "exact",
    }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: "36px" }}>

        {/* Name */}
        {resume.name && (
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: "48px",
            fontWeight: 800,
            color: "#0a0a0f",
            letterSpacing: "-2px",
            lineHeight: 0.95,
            marginBottom: "10px",
          }}>
            {resume.name}
          </div>
        )}

        {/* Title + meta row */}
        <div style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0",
          borderTop: "3px solid #0a0a0f",
          borderBottom: "1px solid #ddd",
          padding: "8px 0",
          marginTop: "10px",
        }}>

          {resume.title && (
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#0a0a0f",
              paddingRight: "16px",
              marginRight: "16px",
              borderRight: "1px solid #ccc",
            }}>
              {resume.title}
            </div>
          )}

          {[resume.email, resume.phone, resume.location]
            .filter(Boolean)
            .map((item, i, arr) => (
              <span key={i} style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "9px",
                color: "#666",
                paddingRight: i < arr.length - 1 ? "16px" : 0,
                marginRight: i < arr.length - 1 ? "16px" : 0,
                borderRight: i < arr.length - 1 ? "1px solid #ddd" : "none",
              }}>
                {item}
              </span>
            ))
          }

          {links.length > 0 && (
            <>
              <div style={{ width: "1px", height: "12px", background: "#ddd", margin: "0 16px" }} />
              {links.map((l, i) => (
                <a key={i} href={l} style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "9px",
                  color: "#0a0a0f",
                  textDecoration: "none",
                  marginRight: "14px",
                  borderBottom: "1px solid #c8ff00",
                  paddingBottom: "1px",
                }}>
                  {hostname(l)}
                </a>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ── SUMMARY ── */}
      {resume.summary && (
        <div style={{ marginBottom: "28px" }}>
          <p style={{
            fontSize: "13px",
            color: "#222",
            lineHeight: 1.75,
            margin: 0,
            borderLeft: "3px solid #c8ff00",
            paddingLeft: "16px",
            fontStyle: "italic",
          }}>
            {resume.summary}
          </p>
        </div>
      )}

      {/* ── EXPERIENCE ── */}
      {hasExp && (
        <Section label="Experience">
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {resume.experience.map((exp) => (
              (exp.company || exp.role) && (
                <div key={exp.id}>
                  {/* Row: role/company + date */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: "12px",
                    alignItems: "start",
                    marginBottom: "4px",
                  }}>
                    <div>
                      <span style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: "14px",
                        fontWeight: 700,
                        color: "#0a0a0f",
                        letterSpacing: "-0.3px",
                      }}>
                        {exp.role}
                      </span>
                      {exp.company && (
                        <span style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "10px",
                          color: "#666",
                          marginLeft: "10px",
                          fontWeight: 400,
                        }}>
                          @ {exp.company}
                        </span>
                      )}
                    </div>

                    {(exp.start || exp.end || exp.current) && (
                      <div style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "9px",
                        color: "#fff",
                        background: "#0a0a0f",
                        padding: "2px 8px",
                        borderRadius: "2px",
                        whiteSpace: "nowrap",
                        letterSpacing: "0.04em",
                        marginTop: "2px",
                      }}>
                        {dateRange(exp.start, exp.end, exp.current)}
                      </div>
                    )}
                  </div>

                  {/* Bullets */}
                  {clean(exp.bullets).length > 0 && (
                    <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none" }}>
                      {clean(exp.bullets).map((b, bi) => (
                        <li key={bi} style={{
                          display: "grid",
                          gridTemplateColumns: "12px 1fr",
                          gap: "6px",
                          fontSize: "11.5px",
                          color: "#333",
                          lineHeight: 1.65,
                          marginBottom: "3px",
                        }}>
                          <span style={{ color: "#c8ff00", fontWeight: 900, fontSize: "14px", lineHeight: 1.4 }}>—</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Thin rule between entries */}
                  <div style={{
                    height: "1px",
                    background: "#f0f0f0",
                    marginTop: "16px",
                  }} />
                </div>
              )
            ))}
          </div>
        </Section>
      )}

      {/* ── PROJECTS ── */}
      {hasProj && (
        <Section label="Projects">
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "14px",
          }}>
            {resume.projects.map((p) => (
              p.title && (
                <div key={p.id} style={{
                  border: "1px solid #e0e0e0",
                  borderTop: "3px solid #0a0a0f",
                  padding: "14px",
                  background: "#fafafa",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                    <div style={{
                      fontFamily: "'Syne', sans-serif",
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "#0a0a0f",
                      letterSpacing: "-0.2px",
                    }}>
                      {p.title}
                    </div>
                    {(p.start || p.end) && (
                      <div style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "8px",
                        color: "#999",
                        whiteSpace: "nowrap",
                        marginLeft: "8px",
                      }}>
                        {dateRange(p.start, p.end, false)}
                      </div>
                    )}
                  </div>

                  {p.url && (
                    <a href={p.url} style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "8px",
                      color: "#666",
                      textDecoration: "none",
                      display: "block",
                      marginBottom: "6px",
                      borderBottom: "1px solid #c8ff00",
                      width: "fit-content",
                      paddingBottom: "1px",
                    }}>
                      {hostname(p.url)}
                    </a>
                  )}

                  {p.description && (
                    <p style={{
                      fontSize: "10.5px",
                      color: "#444",
                      lineHeight: 1.6,
                      margin: 0,
                    }}>
                      {p.description}
                    </p>
                  )}
                </div>
              )
            ))}
          </div>
        </Section>
      )}

      {/* ── EDUCATION + SKILLS ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: hasEdu && skills.length > 0 ? "1fr 1fr" : "1fr",
        gap: "32px",
      }}>

        {/* Education */}
        {hasEdu && (
          <Section label="Education">
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {resume.education.map((edu) => (
                (edu.school || edu.degree) && (
                  <div key={edu.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{
                        fontFamily: "'Syne', sans-serif",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#0a0a0f",
                        letterSpacing: "-0.2px",
                      }}>
                        {edu.school}
                      </div>
                      {(edu.start || edu.end) && (
                        <div style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "8px",
                          color: "#999",
                          whiteSpace: "nowrap",
                          marginLeft: "8px",
                        }}>
                          {dateRange(edu.start, edu.end, false)}
                        </div>
                      )}
                    </div>
                    {edu.degree && (
                      <div style={{
                        fontSize: "11px",
                        color: "#555",
                        marginTop: "2px",
                      }}>
                        {edu.degree}
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          </Section>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <Section label="Skills">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {skills.map((s, i) => (
                <span key={i} style={{
                  fontSize: "10px",
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 700,
                  color: "#0a0a0f",
                  border: "1.5px solid #0a0a0f",
                  padding: "4px 10px",
                  borderRadius: "2px",
                  letterSpacing: "0.05em",
                  lineHeight: 1.4,
                  // Every 3rd skill gets lime highlight
                  ...(i % 3 === 0 ? {
                    background: "#c8ff00",
                    borderColor: "#c8ff00",
                  } : {
                    background: "transparent",
                  }),
                }}>
                  {s}
                </span>
              ))}
            </div>
          </Section>
        )}
      </div>

    </div>
  );
}