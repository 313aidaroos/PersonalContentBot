"use client";

import { FormEvent, useState } from "react";

export default function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, priority }),
      });

      const data = (await res.json()) as {
        ticket_id?: string;
        message?: string;
        error?: string;
      };

      if (!res.ok) throw new Error(data.error || "Failed to submit support request");

      setTicketId(data.ticket_id || null);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error submitting support request");
    } finally {
      setBusy(false);
    }
  }

  if (submitted) {
    return (
      <main className="wrap">
        <section className="card" style={{ maxWidth: "600px", margin: "80px auto" }}>
          <h2>Support Request Submitted</h2>
          <p>
            Thank you for contacting us. Your ticket ID is <strong>{ticketId}</strong>.
          </p>
          <p>We'll get back to you at <strong>{email}</strong> shortly.</p>
          <button
            onClick={() => {
              setSubmitted(false);
              setName("");
              setEmail("");
              setSubject("");
              setMessage("");
              setPriority("medium");
              setTicketId(null);
            }}
          >
            Submit Another Request
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="wrap">
      <header className="top">
        <div>
          <h1>Support</h1>
          <p>Need help? Send us a message and we'll get back to you shortly.</p>
        </div>
      </header>

      <form className="card" onSubmit={onSubmit} style={{ maxWidth: "700px", margin: "0 auto" }}>
        <label htmlFor="name">Name</label>
        <input
          id="name"
          type="text"
          required
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="subject">Subject</label>
        <input
          id="subject"
          type="text"
          required
          minLength={3}
          maxLength={200}
          placeholder="What can we help with?"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />

        <label htmlFor="message">Message</label>
        <textarea
          id="message"
          required
          minLength={10}
          maxLength={2000}
          placeholder="Describe your issue or question in detail…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ minHeight: "150px" }}
        />

        <label htmlFor="priority">Priority</label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>

        <button type="submit" disabled={busy}>
          {busy ? "Submitting…" : "Submit Support Request"}
        </button>

        {error ? <div className="err">{error}</div> : null}
      </form>
    </main>
  );
}
