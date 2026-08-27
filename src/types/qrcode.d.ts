declare module "qrcode" {
  type QROptions = {
    type?: "svg";
    errorCorrectionLevel?: "L" | "M" | "Q" | "H";
    margin?: number;
    width?: number;
    color?: { dark?: string; light?: string };
  };
  export function toString(text: string, options?: QROptions): Promise<string>;
}
