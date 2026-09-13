import { Router } from "express";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { createWriteStream, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { env } from "../config/env.js";
import { ExportRecord } from "../models/ExportRecord.js";
import { Transaction } from "../models/Transaction.js";

export const exportRouter = Router();
const inputSchema = z.object({
  format: z.enum(["XLSX", "PDF"]),
  language: z.enum(["en", "hi"]).default("en"),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  location: z.enum(["MANDIR", "DHARAMSHALA"]).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
});
const exportRoot = path.resolve(env.EXPORT_DIR);
type ExportInput = z.infer<typeof inputSchema>;

function makeFilter(input: ExportInput) {
  const filter: any = {};
  if (input.from || input.to)
    filter.date = {
      ...(input.from && { $gte: input.from }),
      ...(input.to && { $lte: input.to }),
    };
  if (input.location) filter.location = input.location;
  if (input.type) filter.type = input.type;
  return filter;
}
const rupees = (paise: number) =>
  `INR ${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

async function generateExport(jobId: string, input: ExportInput) {
  try {
    const rows = await Transaction.find(makeFilter(input)).sort({
      date: -1,
      createdAt: -1,
    });
    await mkdir(exportRoot, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const fileName = `mandirlekha-${stamp}.${input.format === "XLSX" ? "xlsx" : "pdf"}`;
    const filePath = path.join(exportRoot, fileName);
    if (input.format === "XLSX") {
      const hindi = input.language === "hi";
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Hisab");
      sheet.columns = [
        { header: hindi ? "प्रविष्टि क्र." : "Entry No.", key: "entryNumber", width: 11 },
        { header: hindi ? "प्रविष्टि आईडी" : "Entry ID", key: "entryId", width: 14 },
        { header: hindi ? "दिनांक" : "Date", key: "date", width: 14 },
        { header: hindi ? "स्थान" : "Location", key: "location", width: 18 },
        { header: hindi ? "प्रकार" : "Type", key: "type", width: 18 },
        { header: hindi ? "मद संख्या" : "Items", key: "itemCount", width: 10 },
        { header: hindi ? "मद विवरण और अलग राशि" : "Item Details (separate amounts)", key: "itemDetails", width: 52 },
        { header: hindi ? "भुगतान किसे किया" : "Paid To / Vendor", key: "paidTo", width: 32 },
        { header: hindi ? "टिप्पणी" : "Notes", key: "notes", width: 45 },
        { header: hindi ? "कुल राशि (रुपये)" : "Transaction Total (INR)", key: "entryTotal", width: 24 },
      ];
      rows.forEach((transaction, transactionIndex) => {
        const row = sheet.addRow({
          entryNumber: transactionIndex + 1,
          entryId: transaction.id.slice(-8).toUpperCase(),
          date: transaction.date,
          location: hindi ? (transaction.location === "MANDIR" ? "मंदिर" : "धर्मशाला") : transaction.location,
          type: hindi ? (transaction.type === "INCOME" ? "आय" : "व्यय") : transaction.type,
          itemCount: transaction.items.length,
          itemDetails: transaction.items.map((item, index) => `${index + 1}. ${item.description} — ${rupees(item.amountPaise)}`).join("\n"),
          paidTo: transaction.items.map((item, index) => item.paidTo ? `${index + 1}. ${item.paidTo}` : "").filter(Boolean).join("\n"),
          notes: transaction.items.map((item, index) => item.notes ? `${index + 1}. ${item.notes}` : "").filter(Boolean).join("\n"),
          entryTotal: transaction.totalPaise / 100,
        });
        row.height = Math.max(24, transaction.items.length * 18);
        row.alignment = { vertical: "top", wrapText: true };
      });
      sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      sheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF7F1D1D" },
      };
      sheet.getColumn("entryTotal").numFmt = "₹#,##0.00";
      sheet.views = [{ state: "frozen", ySplit: 1 }];
      sheet.autoFilter = { from: "A1", to: "J1" };
      await workbook.xlsx.writeFile(filePath);
    } else {
      await new Promise<void>((resolve, reject) => {
        const document = new PDFDocument({ margin: 36, size: "A4" });
        const hindi = input.language === "hi";
        if (hindi) document.registerFont("Hindi", path.resolve("assets/fonts/NotoSans-Variable.ttf")).font("Hindi");
        const output = createWriteStream(filePath);
        document.pipe(output);
        document.fontSize(20).fillColor("#7f1d1d").text(hindi ? "मंदिरलेखा" : "MandirLekha");
        document
          .moveDown()
          .fontSize(10)
          .fillColor("#444")
          .text(`${hindi ? "निर्मित" : "Generated"}: ${new Date().toLocaleString("en-IN")}`);
        document.text(`${hindi ? "कुल प्रविष्टियां" : "Transactions in this report"}: ${rows.length}`);
        document.moveDown();
        for (const [transactionIndex, transaction] of rows.entries()) {
          document
            .fontSize(11)
            .fillColor("#7f1d1d")
            .text(
              `${hindi ? "प्रविष्टि" : "TRANSACTION"} ${transactionIndex + 1} ${hindi ? "कुल" : "OF"} ${rows.length} | #${transaction.id.slice(-8).toUpperCase()} | ${transaction.date} | ${hindi ? (transaction.location === "MANDIR" ? "मंदिर" : "धर्मशाला") : transaction.location} | ${hindi ? (transaction.type === "INCOME" ? "आय" : "व्यय") : transaction.type}`,
            );
          transaction.items.forEach((item, index) =>
            document
              .fontSize(9)
              .fillColor("#333")
              .text(
                `  ${hindi ? "मद" : "Item"} ${index + 1}: ${item.description} — ${rupees(item.amountPaise)}${item.paidTo ? ` | ${hindi ? "भुगतान" : "Paid to"}: ${item.paidTo}` : ""}${item.notes ? ` | ${hindi ? "टिप्पणी" : "Notes"}: ${item.notes}` : ""}`,
              ),
          );
          document
            .fontSize(10)
            .fillColor("#111")
            .text(`  ${hindi ? "कुल राशि" : "Transaction Total"}: ${rupees(transaction.totalPaise)}`, {
              align: "right",
            });
          document.moveDown(0.75);
          if (document.y > 740) document.addPage();
        }
        document.end();
        output.on("finish", resolve);
        output.on("error", reject);
      });
    }
    await ExportRecord.findByIdAndUpdate(jobId, {
      status: "COMPLETED",
      recordCount: rows.length,
      fileName,
      filePath,
      completedAt: new Date(),
      $unset: { errorMessage: 1 },
    });
  } catch (error) {
    console.error(`Export job ${jobId} failed`, error);
    await ExportRecord.findByIdAndUpdate(jobId, {
      status: "FAILED",
      errorMessage:
        error instanceof Error ? error.message : "Report generation failed",
      completedAt: new Date(),
    });
  }
}

exportRouter.get("/", async (req, res) => {
  const query = z
    .object({
      page: z.coerce.number().int().positive().default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
    })
    .parse(req.query);
  const [rows, total] = await Promise.all([
    ExportRecord.find()
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.limit)
      .limit(query.limit),
    ExportRecord.countDocuments(),
  ]);
  res.json({
    data: rows.map((row) => ({
      id: row.id,
      format: row.format,
      status: row.status,
      filters: row.filters,
      recordCount: row.recordCount,
      fileName: row.fileName,
      errorMessage: row.errorMessage,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      pages: Math.max(1, Math.ceil(total / query.limit)),
    },
  });
});
exportRouter.post("/", async (req, res, next) => {
  try {
    const input = inputSchema.parse(req.body);
    const job = await ExportRecord.create({
      format: input.format,
      status: "PENDING",
      filters: {
        from: input.from,
        to: input.to,
        location: input.location,
        type: input.type,
        language: input.language,
      },
      recordCount: 0,
    });
    res.status(202).json({ id: job.id, status: job.status });
    setImmediate(() => void generateExport(job.id, input));
  } catch (error) {
    next(error);
  }
});
exportRouter.get("/:id/download", async (req, res) => {
  const row = await ExportRecord.findById(req.params.id);
  if (!row) return res.status(404).json({ message: "Export not found" });
  if (row.status !== "COMPLETED")
    return res
      .status(409)
      .json({
        message:
          row.status === "FAILED"
            ? "Export generation failed"
            : "Export is still being generated",
      });
  if (!row.filePath || !row.fileName || !existsSync(row.filePath))
    return res.status(404).json({ message: "Export file not found" });
  const resolved = path.resolve(row.filePath);
  if (path.dirname(resolved) !== exportRoot)
    return res.status(400).json({ message: "Invalid export path" });
  res.download(resolved, row.fileName);
});
