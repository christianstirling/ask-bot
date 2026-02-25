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
    min: 0.53,
    max: 1.33,
    label: "Hand height",
    hint: "Must be between 0.53 and 1.33 meters",
  },
  distance: {
    min: 2.1,
    max: 61,
    label: "Distance",
    hint: "Must be between 2.1 and 61 meters",
  },
  frequency: {
    min: 0.0021,
    max: 10,
    label: "Frequency",
    hint: "Must be between 0.0021 and 10 per minute",
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
            <h2 className="input-label">Type of action being performed</h2>

            <div className="input-box">
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
          </div>
          <div className="error-item">
            {submitAttempted && errors.action && (
              <span className="field-error">{errors.action}</span>
            )}
          </div>

          <label className="input-item">
            <h2 className="input-label">
              Force needed to start moving the object (in kg-force)
            </h2>

            <input
              type="number"
              className="input-box"
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
          <div className="error-item">
            {showError("initialForce") && (
              <span className="field-error" id="initialForce-error">
                {errors.initialForce}
              </span>
            )}
          </div>

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
            <h2 className="input-label">
              Vertical height of the hands above the floor (in meters)
            </h2>
            <input
              type="number"
              className="input-box"
              name="handHeight"
              value={form.handHeight}
              onChange={handleChange}
              onBlur={handleBlur}
              min={FIELD_RULES.handHeight.min}
              max={FIELD_RULES.handHeight.max}
              step="0.001"
              aria-describedby={
                showError("handHeight") ? "handHeight-error" : undefined
              }
              aria-invalid={!!showError("handHeight")}
            />
          </label>
          <div className="error-item">
            {showError("handHeight") && (
              <span className="field-error" id="handHeight-error">
                {errors.handHeight}
              </span>
            )}
          </div>

          <label htmlFor="" className="input-item">
            <h2 className="input-label">
              Horizontal distance that the object is moved (in meters)
            </h2>

            <input
              type="number"
              className="input-box"
              name="distance"
              value={form.distance}
              onChange={handleChange}
              onBlur={handleBlur}
              min={FIELD_RULES.distance.min}
              max={FIELD_RULES.distance.max}
              step="0.01"
              aria-describedby={
                showError("distance") ? "distance-error" : undefined
              }
              aria-invalid={!!showError("distance")}
            />
          </label>
          <div className="error-item">
            {showError("distance") && (
              <span className="field-error" id="distance-error">
                {errors.distance}
              </span>
            )}
          </div>

          <label htmlFor="" className="input-item">
            <h2 className="input-label">
              Frequency (number of times the task is performed per minute)
            </h2>
            <input
              type="number"
              className="input-box"
              name="frequency"
              value={form.frequency}
              onChange={handleChange}
              onBlur={handleBlur}
              min={FIELD_RULES.frequency.min}
              max={FIELD_RULES.frequency.max}
              step="0.00001"
              aria-describedby={
                showError("frequency") ? "frequency-error" : undefined
              }
              aria-invalid={!!showError("frequency")}
            />
          </label>
          <div className="error-item">
            {showError("frequency") && (
              <span className="field-error" id="frequency-error">
                {errors.frequency}
              </span>
            )}
          </div>
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
