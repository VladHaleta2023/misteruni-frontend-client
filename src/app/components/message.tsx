import React, { useEffect } from "react";
import { createPortal } from "react-dom";
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
  useEffect(() => {
    if (visible) {
      const scrollBarCompensation = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollBarCompensation}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [visible]);

  if (!visible) return null;

  const popupContent = (
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

  return createPortal(popupContent, document.body);
}