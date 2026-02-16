import { toast } from "react-toastify";

const TIMES = {
  SUCCESS: 3000,
  WARNING: 4000,
  ERROR: 4000,
};

export function showAlert(statusCode: number, message: string) {
  if (statusCode >= 200 && statusCode < 300) {
    toast.success(message, { autoClose: TIMES.SUCCESS });
  } else if (statusCode >= 400 && statusCode < 500) {
    toast.warning(message, { autoClose: TIMES.WARNING });
  } else {
    toast.error(message, { autoClose: TIMES.ERROR });
  }
}

export function showInfo(message: string) {
  toast.info(message, { autoClose: false });
}