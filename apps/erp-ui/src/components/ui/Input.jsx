import "./Input.css";

export default function Input({
  label,
  error,
  icon: Icon,
  className = "",
  ...props
}) {
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
