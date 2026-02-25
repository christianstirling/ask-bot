import "./MessageBubble.css";

export default function MessageBubble({ role, content }) {
  const isUser = role === "user";
  const messageColor = isUser ? "gray" : "#242424";
  const textColor = isUser ? "#242424" : "lightgray";
  const alignDirection = isUser ? "left" : "left";

  return (
    <div className={`message-row ${isUser ? "user" : "assistant"}`}>
      <div
        className="MessageBubble"
        style={{
          backgroundColor: messageColor,
          textAlign: alignDirection,
          color: textColor,
        }}
      >
        {content}
      </div>
    </div>
  );
}
