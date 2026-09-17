"use client";

import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function CixyChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput("");

    const updated = [...messages, { role: "user" as const, content: userMessage }];
    setMessages(updated);

    setBusy(true);
    try {
      const res = await fetch("/api/cixy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });

      const data = (await res.json()) as { reply?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Chat failed");

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply || "" }]);
    } catch (err) {
      const error = err instanceof Error ? err.message : "Error";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${error}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Chat toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="cixy-toggle"
        title="Ask Cixy for help"
      >
        💬
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="cixy-chat">
          <div className="cixy-header">
            <h3>Cixy</h3>
            <button className="close" onClick={() => setIsOpen(false)}>
              ✕
            </button>
          </div>
          <div className="cixy-messages">
            {messages.length === 0 && (
              <div className="cixy-welcome">
                <p>As-salamu alaykum! 👋</p>
                <p>I'm Cixy. Ask me anything about creating one-minute videos.</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`cixy-message ${msg.role}`}>
                <p>{msg.content}</p>
              </div>
            ))}
            {busy && (
              <div className="cixy-message assistant">
                <p>Thinking…</p>
              </div>
            )}
          </div>
          <form className="cixy-form" onSubmit={onSubmit}>
            <input
              type="text"
              placeholder="Ask Cixy…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={busy}
            />
            <button type="submit" disabled={busy || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      )}

      <style jsx>{`
        .cixy-toggle {
          position: fixed;
          bottom: 20px;
          right: 20px;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #2a2a2a;
          border: 2px solid #666;
          color: #fff;
          font-size: 24px;
          cursor: pointer;
          z-index: 999;
          transition: background 0.2s;
        }
        .cixy-toggle:hover {
          background: #333;
        }

        .cixy-chat {
          position: fixed;
          bottom: 80px;
          right: 20px;
          width: 350px;
          height: 500px;
          background: #1a1a1a;
          border: 1px solid #444;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        .cixy-header {
          padding: 16px;
          border-bottom: 1px solid #333;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .cixy-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
        }
        .cixy-header .close {
          background: none;
          border: none;
          color: #999;
          cursor: pointer;
          font-size: 18px;
          padding: 0;
        }

        .cixy-messages {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .cixy-welcome {
          text-align: center;
          color: #999;
          padding: 20px 0;
        }
        .cixy-welcome p {
          margin: 8px 0;
          font-size: 13px;
        }

        .cixy-message {
          display: flex;
          justify-content: flex-start;
          margin-bottom: 4px;
        }
        .cixy-message.user {
          justify-content: flex-end;
        }

        .cixy-message p {
          max-width: 80%;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          line-height: 1.4;
          margin: 0;
        }

        .cixy-message.user p {
          background: #0a66c2;
          color: #fff;
        }
        .cixy-message.assistant p {
          background: #333;
          color: #e0e0e0;
        }

        .cixy-form {
          border-top: 1px solid #333;
          padding: 12px;
          display: flex;
          gap: 8px;
        }
        .cixy-form input {
          flex: 1;
          padding: 8px;
          border: 1px solid #444;
          border-radius: 4px;
          background: #252525;
          color: #fff;
          font-size: 13px;
        }
        .cixy-form input::placeholder {
          color: #666;
        }
        .cixy-form button {
          padding: 8px 16px;
          background: #0a66c2;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
        }
        .cixy-form button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
