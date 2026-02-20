import { useState } from "react";
import "./TaskInput.css";

const FIELD_RULES = {
  initialForce: {
    min: 0,
    max: 500,
    label: "Initial force",
    hint: "Must be between 0 and 500 kg-force",
  },
  handHeight: {
    min: 0,
    max: 2.5,
    label: "Hand height",
    hint: "Must be between 0 and 2.5 meters",
  },
  distance: {
    min: 0.1,
    max: 100,
    label: "Distance",
    hint: "Must be between 0.1 and 100 meters",
  },
  frequency: {
    min: 0.1,
    max: 60,
    label: "Frequency",
    hint: "Must be between 0.1 and 60 per minute",
  },
};

function validate(name, value) {
  // console.log("Name:", name);
  // console.log("Value:", value);
  if (value === "" || value === null) {
    return "Required";
  }

  const num = parseFloat(value);
  if (isNaN(num)) return "Must be a valid number";

  const rule = FIELD_RULES[name];
  if (!rule) return null;

  if (num < rule.min || num > rule.max) return rule.hint;

  return null;
}
function validateAll(form) {
  const newErrors = {};

  if (!form.action) newErrors.action = "Please select an action type";

  for (const name of Object.keys(FIELD_RULES)) {
    const error = validate(name, form[name]);
    if (error) newErrors[name] = error;
  }

  return newErrors;
}

export default function TaskInput({ onSend }) {
  const [form, setForm] = useState({
    action: "",
    initialForce: "",
    // sustainedForce: "",
    handHeight: "",
    distance: "",
    frequency: "",
  });

  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));

    if (touched[name] || submitAttempted) {
      setErrors((prev) => ({ ...prev, [name]: validate(name, value) }));
    }
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validate(name, value) }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setSubmitAttempted(true);

    const newErrors = validateAll(form);
    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some(Boolean);

    if (hasErrors) return;
    //send to api here
    onSend(form);

    setSubmitAttempted(false);
    setTouched({});
    setErrors({});
  }

  function handleClear() {
    setForm({
      action: "",
      initialForce: "",
      handHeight: "",
      distance: "",
      frequency: "",
    });
    setErrors({});
    setTouched({});
    setSubmitAttempted(false);
  }

  function showError(name) {
    return (touched[name] || submitAttempted) && errors[name];
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
          {submitAttempted && errors.action && (
            <span className="field-error">{errors.action}</span>
          )}

          <label className="input-item">
            Force needed to start moving the object (in kg-force)
            <input
              type="number"
              name="initialForce"
              value={form.initialForce}
              onChange={handleChange}
              onBlur={handleBlur}
              min={FIELD_RULES.initialForce.min}
              max={FIELD_RULES.initialForce.max}
              aria-describedby={
                showError("initialForce") ? "initialForce-error" : undefined
              }
              aria-invalid={!!showError("initialForce")}
            />
          </label>
          {showError("initialForce") && (
            <span className="field-error" id="initialForce-error">
              {errors.initialForce}
            </span>
          )}

          {/* <label className="input-item">
            Force needed to keep the object moving (in kg-force)
            <input
              type="number"
              name="sustainedForce"
              value={form.sustainedForce}
              onChange={handleChange}
            />
          </label>
          {errors.sustainedForce && (
            <span className="error">{errors.sustainedForce}</span>
          )} */}

          <label htmlFor="" className="input-item">
            Vertical height of the hands above the floor (in meters)
            <input
              type="number"
              name="handHeight"
              value={form.handHeight}
              onChange={handleChange}
              onBlur={handleBlur}
              min={FIELD_RULES.handHeight.min}
              max={FIELD_RULES.handHeight.max}
              step="0.01"
              aria-describedby={
                showError("handHeight") ? "handHeight-error" : undefined
              }
              aria-invalid={!!showError("handHeight")}
            />
          </label>
          {showError("handHeight") && (
            <span className="field-error" id="handHeight-error">
              {errors.handHeight}
            </span>
          )}

          <label htmlFor="" className="input-item">
            Horizontal distance that the object is moved (in meters)
            <input
              type="number"
              name="distance"
              value={form.distance}
              onChange={handleChange}
              onBlur={handleBlur}
              min={FIELD_RULES.distance.min}
              max={FIELD_RULES.distance.max}
              step="0.1"
              aria-describedby={
                showError("distance") ? "distance-error" : undefined
              }
              aria-invalid={!!showError("distance")}
            />
          </label>
          {showError("distance") && (
            <span className="field-error" id="distance-error">
              {errors.distance}
            </span>
          )}

          <label htmlFor="" className="input-item">
            Frequency (number of times the task is performed per minute)
            <input
              type="number"
              name="frequency"
              value={form.frequency}
              onChange={handleChange}
              onBlur={handleBlur}
              min={FIELD_RULES.frequency.min}
              max={FIELD_RULES.frequency.max}
              step="0.1"
              aria-describedby={
                showError("frequency") ? "frequency-error" : undefined
              }
              aria-invalid={!!showError("frequency")}
            />
          </label>
          {showError("frequency") && (
            <span className="field-error" id="frequency-error">
              {errors.frequency}
            </span>
          )}
        </fieldset>
        <div className="button-container">
          <button type="button" onClick={handleClear} className="input-button">
            Clear
          </button>

          <button type="submit" className="input-button">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
