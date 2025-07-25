import { toast } from "react-toastify";

export function showAlert(statusCode: number, message: string) {
  if (statusCode >= 200 && statusCode < 300) {
    toast.success(message);
  } else if (statusCode >= 400 && statusCode < 500) {
    toast.warning(message);
  } else {
    toast.error(message);
  }
}

export function showInfo(message: string) {
  toast.info(message);
}