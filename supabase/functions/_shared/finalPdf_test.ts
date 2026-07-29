import { PDFArray, PDFDocument, PDFName } from "pdf-lib"
import { getFinalPdfStoragePath } from "./completionStorage.ts"
import { generateAuthoritativeFinalPdf } from "./finalPdf.ts"

Deno.test("authoritative final PDF uses stored field data", async () => {
  const original = await PDFDocument.create()
  original.addPage([612, 792])
  const finalBytes = await generateAuthoritativeFinalPdf(
    await original.save(),
    {
      title: "Agreement",
      fields: [
        {
          id: "date-field",
          field_type: "date",
          page_number: 1,
          x: 10,
          y: 10,
          width: 25,
          height: 8,
        },
        {
          id: "checkbox-field",
          field_type: "checkbox",
          page_number: 1,
          x: 10,
          y: 22,
          width: 5,
          height: 5,
        },
      ],
      placements: [
        { field_id: "date-field", signature_id: "2026-07-26" },
        { field_id: "checkbox-field", signature_id: "checked" },
      ],
      audit_trail: [],
    },
    new Date("2026-07-26T04:00:00.000Z"),
  )
  const finalPdf = await PDFDocument.load(finalBytes)
  if (finalPdf.getPageCount() !== 1) {
    throw new Error("The final PDF did not preserve the original page")
  }
  if (finalBytes.length <= 500) {
    throw new Error("The final PDF did not contain rendered field content")
  }
})

Deno.test("authoritative final PDF embeds a verification QR certificate", async () => {
  const original = await PDFDocument.create()
  original.addPage([612, 792])
  const finalBytes = await generateAuthoritativeFinalPdf(
    await original.save(),
    {
      title: "Verified Agreement",
      fields: [{
        id: "text-field",
        field_type: "text",
        page_number: 1,
        x: 10,
        y: 10,
        width: 25,
        height: 8,
      }],
      placements: [{ field_id: "text-field", signature_id: "Approved" }],
      audit_trail: [],
      verification: {
        url: `https://sign.somadhan.com/verify#v1.${"A".repeat(43)}`,
        reference: "SS-1234-ABCD-5678",
        evidence_sha256: "a".repeat(64),
        completed_at: "2026-07-29T09:55:00.000Z",
      },
    },
    new Date("2026-07-29T10:00:00.000Z"),
  )
  const finalPdf = await PDFDocument.load(finalBytes)
  if (finalPdf.getPageCount() !== 2) {
    throw new Error("The verification certificate was not appended")
  }
  const certificateSize = finalPdf.getPage(1).getSize()
  if (certificateSize.width !== 612 || certificateSize.height !== 792) {
    throw new Error("The certificate did not preserve the original page dimensions")
  }
  const certificateResources = finalPdf.getPage(1).node.Resources()
  if (!certificateResources?.lookup(PDFName.of("XObject"))) {
    throw new Error("The verification QR image was not embedded")
  }
  if (!finalPdf.getPage(1).node.lookup(PDFName.of("Annots"), PDFArray)) {
    throw new Error("The verification QR block is not clickable")
  }
})

Deno.test("audit continuation pages preserve a landscape original page size", async () => {
  const original = await PDFDocument.create()
  original.addPage([720, 405])
  const auditTrail = Array.from({ length: 24 }, (_, index) => ({
    action: `Signing event ${index + 1}`,
    user_email: `signer${index + 1}@example.com`,
    user_name: `Signer ${index + 1}`,
    created_at: `2026-07-29T10:${String(index).padStart(2, "0")}:00.000Z`,
    metadata: JSON.stringify({ version: "1.0", language: "en" }),
  }))
  const finalBytes = await generateAuthoritativeFinalPdf(
    await original.save(),
    {
      title: "Landscape Agreement",
      fields: [{
        id: "text-field",
        field_type: "text",
        page_number: 1,
        x: 10,
        y: 10,
        width: 25,
        height: 8,
      }],
      placements: [{ field_id: "text-field", signature_id: "Approved" }],
      audit_trail: auditTrail,
    },
  )
  const finalPdf = await PDFDocument.load(finalBytes)
  if (finalPdf.getPageCount() < 3) {
    throw new Error("The audit trail did not create a continuation page")
  }
  for (const page of finalPdf.getPages().slice(1)) {
    const size = page.getSize()
    if (size.width !== 720 || size.height !== 405) {
      throw new Error("An audit page did not preserve the original page dimensions")
    }
  }
})

Deno.test("authoritative final PDF rejects missing field values", async () => {
  const original = await PDFDocument.create()
  original.addPage([612, 792])
  let rejected = false
  try {
    await generateAuthoritativeFinalPdf(await original.save(), {
      fields: [{
        id: "required-field",
        field_type: "text",
        page_number: 1,
        x: 10,
        y: 10,
        width: 25,
        height: 8,
      }],
      placements: [],
    })
  } catch {
    rejected = true
  }
  if (!rejected) throw new Error("A missing required field was accepted")
})

Deno.test("authoritative final PDF rejects active document actions", async () => {
  const original = await PDFDocument.create()
  original.addPage([612, 792])
  original.catalog.set(PDFName.of("OpenAction"), original.context.obj({
    S: "JavaScript",
    JS: "app.alert(1)",
  }))
  let rejected = false
  try {
    await generateAuthoritativeFinalPdf(await original.save(), {
      fields: [{
        id: "required-field",
        field_type: "text",
        page_number: 1,
        x: 10,
        y: 10,
        width: 25,
        height: 8,
      }],
      placements: [{ field_id: "required-field", signature_id: "Approved" }],
    })
  } catch {
    rejected = true
  }
  if (!rejected) throw new Error("An active document action was accepted")
})

Deno.test("authoritative final PDF rejects oversized signature dimensions", async () => {
  const original = await PDFDocument.create()
  original.addPage([612, 792])
  const header = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x27, 0x10, 0x00, 0x00, 0x27, 0x10,
  ])
  const signature = `data:image/png;base64,${btoa(String.fromCharCode(...header))}`
  let rejected = false
  try {
    await generateAuthoritativeFinalPdf(await original.save(), {
      fields: [{
        id: "signature-field",
        field_type: "signature",
        page_number: 1,
        x: 10,
        y: 10,
        width: 25,
        height: 8,
      }],
      placements: [{ field_id: "signature-field", signature_id: signature }],
    })
  } catch {
    rejected = true
  }
  if (!rejected) throw new Error("An oversized signature image was accepted")
})

Deno.test("final PDFs are stored inside the document owner's private folder", () => {
  const path = getFinalPdfStoragePath(
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
  )
  if (path !== "11111111-1111-4111-8111-111111111111/signed/22222222-2222-4222-8222-222222222222_33333333-3333-4333-8333-333333333333.pdf") {
    throw new Error("The final PDF path is not owner-readable")
  }
})
