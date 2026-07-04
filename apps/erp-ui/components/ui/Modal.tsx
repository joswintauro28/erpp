import { X } from "lucide-react";
import { ReactNode, MouseEventHandler } from "react";
import "./Modal.css";

interface ModalProps {
  isOpen: boolean;
  onClose: MouseEventHandler<HTMLDivElement | HTMLButtonElement>;
  title: string;
  children: ReactNode;
  size?: string;
}

export default function Modal({ isOpen, onClose, title, children, size = "default" }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-panel modal-${size}`}
        onClick={(e: any) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
