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

function SideLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: "8px",
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase" as const,
      color: "#c8ff00",
      marginBottom: "10px",
      paddingBottom: "5px",
      borderBottom: "1px solid rgba(200,255,0,0.3)",
    }}>
      {children}
    </div>
  );
}

function MainLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: "8px",
      fontWeight: 700,
      letterSpacing: "0.18em",
      textTransform: "uppercase" as const,
      color: "#888",
      marginBottom: "12px",
      paddingBottom: "5px",
      borderBottom: "1.5px solid #111",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Template One — Editorial Two-Column
// ─────────────────────────────────────────────────────────────────────────────
// Layout: dark left sidebar (220px) + white right main column
// Aesthetic: bold, editorial, colourful sidebar accent against clean content
// ─────────────────────────────────────────────────────────────────────────────

export default function TemplateOne({ resume }: Props) {
  const links   = clean(resume.links);
  const skills  = clean(resume.skills);

  const hasExp  = resume.experience.some(e => e.company || e.role);
  const hasProj = resume.projects.some(p => p.title);
  const hasEdu  = resume.education.some(e => e.school || e.degree);

  return (
    <div style={{
      display: "flex",
      width: "100%",
      minHeight: "1056px",
      fontFamily: "'Outfit', sans-serif",
      background: "#fff",
      WebkitPrintColorAdjust: "exact",
      printColorAdjust: "exact",
    }}>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{
        width: "220px",
        flexShrink: 0,
        background: "#0f0f1a",
        padding: "36px 22px",
        display: "flex",
        flexDirection: "column",
        gap: "28px",
      }}>

        {/* Avatar / Initials */}
        {resume.name && (
          <div style={{
            width: "64px",
            height: "64px",
            borderRadius: "50%",
            background: "linear-gradient(135deg, #c8ff00 0%, #00c8ff 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Syne', sans-serif",
            fontSize: "22px",
            fontWeight: 800,
            color: "#0a0a0f",
            flexShrink: 0,
          }}>
            {resume.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
          </div>
        )}

        {/* Contact */}
        <div>
          <SideLabel>Contact</SideLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {resume.email && (
              <div>
                <div style={metaKey}>Email</div>
                <div style={metaVal}>{resume.email}</div>
              </div>
            )}
            {resume.phone && (
              <div>
                <div style={metaKey}>Phone</div>
                <div style={metaVal}>{resume.phone}</div>
              </div>
            )}
            {resume.location && (
              <div>
                <div style={metaKey}>Location</div>
                <div style={metaVal}>{resume.location}</div>
              </div>
            )}
          </div>
        </div>

        {/* Links */}
        {links.length > 0 && (
          <div>
            <SideLabel>Links</SideLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {links.map((l, i) => (
                <a key={i} href={l} style={{
                  fontSize: "10px",
                  color: "#c8ff00",
                  textDecoration: "none",
                  wordBreak: "break-all",
                  lineHeight: 1.4,
                  fontFamily: "'Space Mono', monospace",
                }}>
                  {hostname(l)}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div>
            <SideLabel>Skills</SideLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {skills.map((s, i) => (
                <span key={i} style={{
                  fontSize: "9px",
                  fontFamily: "'Space Mono', monospace",
                  fontWeight: 700,
                  color: "#0a0a0f",
                  background: "#c8ff00",
                  padding: "3px 8px",
                  borderRadius: "3px",
                  letterSpacing: "0.04em",
                  lineHeight: 1.4,
                }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Education in sidebar */}
        {hasEdu && (
          <div>
            <SideLabel>Education</SideLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {resume.education.map((edu) => (
                (edu.school || edu.degree) && (
                  <div key={edu.id}>
                    <div style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#f0f0ff",
                      fontFamily: "'Syne', sans-serif",
                      lineHeight: 1.35,
                      marginBottom: "2px",
                    }}>
                      {edu.school}
                    </div>
                    {edu.degree && (
                      <div style={{ fontSize: "10px", color: "#a0a0b8", lineHeight: 1.4, marginBottom: "2px" }}>
                        {edu.degree}
                      </div>
                    )}
                    {(edu.start || edu.end) && (
                      <div style={{ fontSize: "9px", color: "#5a5a7a", fontFamily: "'Space Mono', monospace" }}>
                        {dateRange(edu.start, edu.end, false)}
                      </div>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT MAIN COLUMN ── */}
      <div style={{
        flex: 1,
        padding: "36px 36px 36px 32px",
        display: "flex",
        flexDirection: "column",
        gap: "28px",
        background: "#fff",
      }}>

        {/* Header */}
        <div style={{ borderBottom: "3px solid #111", paddingBottom: "18px" }}>
          {resume.name && (
            <div style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: "34px",
              fontWeight: 800,
              color: "#0a0a0f",
              letterSpacing: "-1px",
              lineHeight: 1.05,
              marginBottom: "6px",
            }}>
              {resume.name}
            </div>
          )}
          {resume.title && (
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "11px",
              fontWeight: 700,
              color: "#555",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}>
              {resume.title}
            </div>
          )}
        </div>

        {/* Summary */}
        {resume.summary && (
          <div>
            <MainLabel>Profile</MainLabel>
            <p style={{
              fontSize: "12px",
              color: "#333",
              lineHeight: 1.7,
              margin: 0,
            }}>
              {resume.summary}
            </p>
          </div>
        )}

        {/* Experience */}
        {hasExp && (
          <div>
            <MainLabel>Experience</MainLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {resume.experience.map((exp) => (
                (exp.company || exp.role) && (
                  <div key={exp.id} style={{ position: "relative", paddingLeft: "14px" }}>
                    {/* Accent tick */}
                    <div style={{
                      position: "absolute",
                      left: 0,
                      top: "3px",
                      width: "4px",
                      height: "4px",
                      borderRadius: "50%",
                      background: "#c8ff00",
                      border: "1px solid #0a0a0f",
                    }} />

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2px" }}>
                      <div>
                        <div style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#0a0a0f",
                          fontFamily: "'Syne', sans-serif",
                          letterSpacing: "-0.2px",
                        }}>
                          {exp.role}
                        </div>
                        <div style={{
                          fontSize: "11px",
                          color: "#555",
                          fontFamily: "'Space Mono', monospace",
                          letterSpacing: "0.04em",
                        }}>
                          {exp.company}
                        </div>
                      </div>
                      {(exp.start || exp.end || exp.current) && (
                        <div style={{
                          fontSize: "9px",
                          fontFamily: "'Space Mono', monospace",
                          color: "#888",
                          whiteSpace: "nowrap",
                          marginLeft: "12px",
                          marginTop: "2px",
                          background: "#f5f5f5",
                          padding: "2px 7px",
                          borderRadius: "3px",
                        }}>
                          {dateRange(exp.start, exp.end, exp.current)}
                        </div>
                      )}
                    </div>

                    {clean(exp.bullets).length > 0 && (
                      <ul style={{ margin: "6px 0 0", padding: 0, listStyle: "none" }}>
                        {clean(exp.bullets).map((b, bi) => (
                          <li key={bi} style={{
                            fontSize: "11px",
                            color: "#333",
                            lineHeight: 1.6,
                            marginBottom: "3px",
                            paddingLeft: "12px",
                            position: "relative",
                          }}>
                            <span style={{
                              position: "absolute",
                              left: 0,
                              color: "#c8ff00",
                              fontWeight: 700,
                              fontSize: "10px",
                            }}>›</span>
                            {b}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {hasProj && (
          <div>
            <MainLabel>Projects</MainLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {resume.projects.map((p) => (
                p.title && (
                  <div key={p.id} style={{
                    borderLeft: "2px solid #c8ff00",
                    paddingLeft: "12px",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{
                        fontSize: "12px",
                        fontWeight: 700,
                        color: "#0a0a0f",
                        fontFamily: "'Syne', sans-serif",
                      }}>
                        {p.title}
                        {p.url && (
                          <a href={p.url} style={{
                            fontSize: "9px",
                            fontFamily: "'Space Mono', monospace",
                            color: "#888",
                            fontWeight: 400,
                            marginLeft: "8px",
                            textDecoration: "none",
                          }}>
                            {hostname(p.url)}
                          </a>
                        )}
                      </div>
                      {(p.start || p.end) && (
                        <div style={{
                          fontSize: "9px",
                          fontFamily: "'Space Mono', monospace",
                          color: "#888",
                          whiteSpace: "nowrap",
                          marginLeft: "12px",
                        }}>
                          {dateRange(p.start, p.end, false)}
                        </div>
                      )}
                    </div>
                    {p.description && (
                      <p style={{ fontSize: "11px", color: "#444", lineHeight: 1.6, margin: "4px 0 0" }}>
                        {p.description}
                      </p>
                    )}
                  </div>
                )
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared inline style objects
// ─────────────────────────────────────────────────────────────────────────────

const metaKey: React.CSSProperties = {
  fontSize: "8px",
  fontFamily: "'Space Mono', monospace",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#5a5a7a",
  marginBottom: "1px",
};

const metaVal: React.CSSProperties = {
  fontSize: "10px",
  color: "#c0c0d8",
  lineHeight: 1.4,
  wordBreak: "break-all",
};