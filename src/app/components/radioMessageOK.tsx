import React from "react";
import "@/app/styles/message.css";

interface SwitchPopUpOKProps {
  onConfirm: () => void;
  textConfirm?: string;
  bodyMaxWidth?: string;
  btnsWidth?: string;
  message?: string;
  visible?: boolean;
  children?: React.ReactNode
}

export default function RadioMessageOK({
  onConfirm,
  textConfirm = "Confirm",
  bodyMaxWidth = "600px",
  btnsWidth = "100px",
  message = "Message",
  visible = false,
  children = null,
}: SwitchPopUpOKProps) {
  if (!visible) return null;
  
  return (
    <div className="popup-overlay">
      <div className="switchPopUp" style={{ maxWidth: bodyMaxWidth }}>
        <div className="text">
          <label>{message}</label>
          {children}
        </div>
        <div className="btnsSwitchPopUp">
          <button
            className="btnSwicthPopUp confirm"
            onClick={onConfirm}
            style={{ width: btnsWidth, maxWidth: btnsWidth }}
          >
            {textConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}