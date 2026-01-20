import "./MessageForm.css";
import { useState } from "react";

export default function MessageForm({ onSend }) {
  const [value, setValue] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSend(value);
    setValue("");
  };

  return (
    <form action="" className="MessageForm" onSubmit={handleSubmit}>
      <input
        type="text"
        className="message_input"
        placeholder="write a message.."
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <button type="submit" className="message_submit">
        send
      </button>
    </form>
  );
}
