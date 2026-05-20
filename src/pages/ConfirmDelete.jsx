import "../style/confirm_modal.css";

export default function ConfirmModal({
  open,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  onConfirm,
  onCancel
}) {

  if (!open) return null;

  return (
    <div
      className="confirm-overlay"
      onClick={onCancel}
    >
      <div
        className="confirm-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-icon">
          ⚠
        </div>

        <div className="confirm-title">
          {title}
        </div>

        <div className="confirm-text">
          {message}
        </div>

        <div className="confirm-actions">
          <button
            className="confirm-cancel"
            onClick={onCancel}
          >
            {cancelText}
          </button>

          <button
            className={`confirm-submit ${variant}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}