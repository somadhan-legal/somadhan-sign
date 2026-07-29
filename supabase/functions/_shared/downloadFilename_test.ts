import { getSignedPdfFilename } from "./downloadFilename.ts"

Deno.test("signed PDF filenames use the Somadhan Sign suffix", () => {
  if (getSignedPdfFilename("Client: Contract.PDF") !== "Client_ Contract_Somadhan_Sign.pdf") {
    throw new Error("The signed PDF filename was not normalized")
  }
  if (getSignedPdfFilename("   ") !== "Document_Somadhan_Sign.pdf") {
    throw new Error("The empty-title fallback was not applied")
  }
})
