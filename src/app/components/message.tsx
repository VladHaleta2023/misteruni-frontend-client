import React from "react";
import "@/app/styles/message.css";

interface SwitchPopUpProps {
  onConfirm: () => void;
  onClose: () => void;
  textConfirm?: string;
  textCancel?: string;
  bodyMaxWidth?: string;
  btnsWidth?: string;
  message?: string;
  visible?: boolean;
}

export default function Message({
  onConfirm,
  onClose,
  textConfirm = "Confirm",
  textCancel = "Cancel",
  bodyMaxWidth = "600px",
  btnsWidth = "100px",
  message = "Message",
  visible = false,
}: SwitchPopUpProps) {
  if (!visible) return null;
  
  return (
    <div className="popup-overlay">
      <div className="switchPopUp" style={{ maxWidth: bodyMaxWidth }}>
        <div className="text">
          <label>{message}</label>
        </div>
        <div className="btnsSwitchPopUp">
          <button
            className="btnSwicthPopUp confirm"
            onClick={onConfirm}
            style={{ width: btnsWidth, maxWidth: btnsWidth }}
          >
            {textConfirm}
          </button>
          <button
            className="btnSwicthPopUp cancel"
            onClick={onClose}
            style={{ width: btnsWidth, maxWidth: btnsWidth }}
          >
            {textCancel}
          </button>
        </div>
      </div>
    </div>
  );
}