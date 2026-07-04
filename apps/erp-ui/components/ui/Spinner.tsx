import "./Spinner.css";

interface SpinnerProps {
  size?: string;
  message?: string;
}

export default function Spinner({ size = "default", message }: SpinnerProps) {
  return (
    <div className="spinner-container">
      <div className={`spinner spinner-${size}`} />
      {message && <p className="spinner-message">{message}</p>}
    </div>
  );
}
