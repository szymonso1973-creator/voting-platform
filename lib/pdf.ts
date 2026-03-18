import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function createProtocolPdf(input: { title: string; organization: string; voter: string; status: string; rows: string[]; }) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText(input.title, { x: 50, y: 790, size: 18, font, color: rgb(0, 0, 0) });
  page.drawText(`Organizacja: ${input.organization}`, { x: 50, y: 760, size: 11, font });
  page.drawText(`Głosujący: ${input.voter}`, { x: 50, y: 742, size: 11, font });
  page.drawText(`Status: ${input.status}`, { x: 50, y: 724, size: 11, font });
  input.rows.forEach((row, index) => {
    page.drawText(row, { x: 50, y: 690 - index * 18, size: 10, font });
  });
  return Buffer.from(await pdf.save());
}
