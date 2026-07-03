import "./Spinner.css";

export default function Spinner({ size = "default", message }) {
  return (
    <div className="spinner-container">
      <div className={`spinner spinner-${size}`} />
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );
}
