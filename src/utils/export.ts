import { SaveFormat } from "../types";

export const saveCanvas = async (
  canvas: HTMLCanvasElement,
  format: SaveFormat,
): Promise<void> => {
  if (format === "pdf") {
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? "landscape" : "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      const imgData = canvas.toDataURL("image/jpeg", 1.0);
      pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
      pdf.save(`webpaint-${new Date().getTime()}.pdf`);
    } catch (err) {
      console.error("Failed to export PDF:", err);
      alert("Failed to export PDF. Ensure jspdf is installed.");
    }
    return;
  }

  const dataUrl = canvas.toDataURL(
    `image/${format === "jpg" ? "jpeg" : "png"}`,
  );
  const link = document.createElement("a");
  link.download = `webpaint-${new Date().getTime()}.${format}`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
