import "./MessageForm.css";
import { useState } from "react";

export default function MessageForm({ onSend }) {
  const [value, setValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSend(value);
    setValue("");
  };

  const handleThumbsUp = (e) => {
    e.preventDefault();
    onSend("👍");
  };

  return (
    <div className="MessageForm">
      <form action="" className="form-left" onSubmit={handleThumbsUp}>
        <button type="submit" className="message_submit">
          👍
        </button>
      </form>

      <form action="" className="form-right" onSubmit={handleSubmit}>
        <input
          type="text"
          className="message_input"
          placeholder="write a message.."
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />

        <button type="submit" className="message_submit">
          Send
        </button>
      </form>
    </div>
  );
}
