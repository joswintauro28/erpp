import "./Input.css";
import { InputHTMLAttributes, ComponentType } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ComponentType<{ className?: string }>;
}

export default function Input({
  label,
  error,
  icon: Icon,
  className = "",
  ...props
}: InputProps) {
  return (
    <div className={`input-group ${className}`}>
      {label && <label className="input-label">{label}</label>}
      <div className={`input-wrapper ${Icon ? "has-icon" : ""} ${error ? "has-error" : ""}`}>
        {Icon && <Icon className="input-icon" />}
        <input className="input-field" {...props} />
      </div>
      {error && <span className="input-error">{error}</span>}
    </div>
  );
}
