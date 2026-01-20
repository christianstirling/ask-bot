import "./MessageContainer.css";
import MessageBubble from "./MessageBubble.jsx";
import { useEffect, useRef } from "react";

export default function MessageContainer({ messages }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);
  return (
    <div className="MessageContainer" ref={containerRef}>
      {/* {messages.length === 0 && (
        <div className="placeholder">Ask Ergo a question!</div>
      )} */}

      {messages.map((msg) => (
        <MessageBubble key={msg.id} role={msg.role} content={msg.content} />
      ))}
    </div>
  );
}
