import { useState } from "react";
import "./TaskInput.css";

export default function TaskInput({ onSend }) {
  const [form, setForm] = useState({
    action: "",
    initialForce: "",
    sustainedForce: "",
    handHeight: "",
    distance: "",
    frequency: "",
  });

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    //send to api here
    onSend(form);
  }

  return (
    <div className="TaskInput">
      <form onSubmit={handleSubmit} className="input-form">
        <fieldset className="input-list">
          <legend className="input-legend">Task Input</legend>
          <div className="input-item">
            Type of action being performed
            <label htmlFor="">
              <input
                type="radio"
                name="action"
                value="push"
                checked={form.action === "push"}
                onChange={handleChange}
              />
              Push
            </label>
            <label htmlFor="">
              <input
                type="radio"
                name="action"
                value="pull"
                checked={form.action === "pull"}
                onChange={handleChange}
              />
              Pull
            </label>
          </div>

          <label className="input-item">
            Force needed to start moving the object (in kg-force)
            <input
              type="number"
              name="initialForce"
              value={form.initialForce}
              onChange={handleChange}
            />
          </label>

          <label className="input-item">
            Force needed to keep the object moving (in kg-force)
            <input
              type="number"
              name="sustainedForce"
              value={form.sustainedForce}
              onChange={handleChange}
            />
          </label>

          <label htmlFor="" className="input-item">
            Vertical height of the hands above the floor (in meters)
            <input
              type="number"
              name="handHeight"
              value={form.handHeight}
              onChange={handleChange}
            />
          </label>

          <label htmlFor="" className="input-item">
            Horizontal distance that the object is moved (in meters)
            <input
              type="number"
              name="distance"
              value={form.distance}
              onChange={handleChange}
            />
          </label>

          <label htmlFor="" className="input-item">
            Frequency (number of times the task is performed per minute)
            <input
              type="number"
              name="frequency"
              value={form.frequency}
              onChange={handleChange}
            />
          </label>
        </fieldset>

        <button type="submit" className="input-button">
          submit
        </button>
      </form>
    </div>
  );
}
