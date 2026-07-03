import { ChevronDown } from "lucide-react";
import "./Select.css";

export default function Select({
  label,
  options = [],
  error,
  className = "",
  placeholder = "Select...",
  ...props
}) {
  return (
    <div className={`select-group ${className}`}>
      {label && <label className="select-label">{label}</label>}
      <div className={`select-wrapper ${error ? "has-error" : ""}`}>
        <select className="select-field" {...props}>
          <option value="">{placeholder}</option>
          {(options || []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="select-chevron" />
      </div>
      {error && <span className="select-error">{error}</span>}
    </div>
  );
}
