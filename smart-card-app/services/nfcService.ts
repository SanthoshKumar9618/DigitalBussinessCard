import api from "./api";


export const assignNfc = (uid: string) =>
  api.post("/nfc/assign", { uid });

export const resolveNfc = (uid: string) =>
  api.get(`/nfc/resolve/${uid}`);

export const generateQr = () =>
  api.post("/nfc/qr");



