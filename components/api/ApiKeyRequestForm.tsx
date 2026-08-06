"use client";

// Request form for API access. Submitting records a row for review; it does not
// mint a key. That is deliberate: an endpoint that issues working credentials to
// anyone who fills in a form is not access control.

import { useState } from "react";

type State = "idle" | "sending" | "sent" | "error";

export function ApiKeyRequestForm() {
  const [contact, setContact] = useState("");
  const [project, setProject] = useState("");
  const [useCase, setUseCase] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    setMessage("");
    try {
      const r = await fetch("/api/key-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contact, project, use_case: useCase }),
      });
      if (r.status === 204) {
        setState("sent");
        return;
      }
      const data = await r.json().catch(() => ({}));
      setState("error");
      setMessage(data.error || "could not send, try again");
    } catch {
      setState("error");
      setMessage("could not send, try again");
    }
  };

  if (state === "sent") {
    return (
      <div style={{ padding: "18px 2px", maxWidth: 620, fontSize: 15, lineHeight: 1.7, color: "var(--ink-70)" }}>
        Request received. Keys are issued by hand, usually within a day. The key arrives at the address you gave
        and is shown once.
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 620, padding: "6px 2px 4px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Field label="Email" required>
          <input
            type="email"
            required
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="you@example.com"
            style={input}
          />
        </Field>
        <Field label="Project">
          <input
            type="text"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            placeholder="what you are building"
            style={input}
          />
        </Field>
        <Field label="What you need the data for">
          <textarea
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            rows={3}
            placeholder="which endpoints, roughly how often"
            style={{ ...input, resize: "vertical", lineHeight: 1.5 }}
          />
        </Field>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 16 }}>
        <button
          type="submit"
          disabled={state === "sending" || contact.trim().length < 5}
          className="data"
          style={{
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            padding: "9px 18px",
            borderRadius: 3,
            border: "1px solid var(--hub-2)",
            background: "transparent",
            color: "var(--hub-2)",
            cursor: state === "sending" ? "default" : "pointer",
            opacity: contact.trim().length < 5 ? 0.45 : 1,
          }}
        >
          {state === "sending" ? "sending" : "request a key"}
        </button>
        {state === "error" && (
          <span style={{ fontSize: 13, color: "var(--iron-text)" }}>{message}</span>
        )}
      </div>
    </form>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <span
        className="data"
        style={{ fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-50)" }}
      >
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}

const input: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  fontSize: 14,
  fontFamily: "var(--font-hanken)",
  color: "var(--ink)",
  background: "var(--paper-2)",
  border: "1px solid var(--ink-20)",
  borderRadius: 3,
  outline: "none",
};
