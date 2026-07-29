import { createClient } from "supabase"
import {
  getDocumentVerificationTokenDigest,
  isDocumentVerificationToken,
} from "../_shared/documentVerification.ts"

const ALLOWED_ORIGINS = new Set([
  "https://sign.somadhan.com",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
])

const responseHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.has(origin)
    ? origin
    : "https://sign.somadhan.com",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json",
  "Referrer-Policy": "no-referrer",
  "Vary": "Origin",
  "X-Content-Type-Options": "nosniff",
})
const jsonResponse = (
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
) => new Response(JSON.stringify(body), {
  status,
  headers: responseHeaders(origin),
})

Deno.serve(async (request) => {
  const origin = request.headers.get("origin")
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: responseHeaders(origin) })
  }
  if (request.method !== "POST") {
    return jsonResponse({ status: "not_found" }, 405, origin)
  }

  const declaredLength = Number(request.headers.get("content-length") || "0")
  if (declaredLength > 1024) {
    return jsonResponse({ status: "not_found" }, 404, origin)
  }

  let token: unknown
  try {
    const body = await request.json()
    token = body?.token
  } catch {
    return jsonResponse({ status: "not_found" }, 404, origin)
  }
  if (!isDocumentVerificationToken(token)) {
    return jsonResponse({ status: "not_found" }, 404, origin)
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ status: "unavailable" }, 503, origin)
  }

  try {
    const tokenDigest = await getDocumentVerificationTokenDigest(token)
    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })
    const { data: verification, error: verificationError } = await serviceClient
      .from("document_verifications")
      .select(
        "document_id, reference_code, evidence_sha256, artifact_sha256, artifact_size, final_storage_path, hash_scheme, status, completed_at, issued_at, revoked_at",
      )
      .eq("token_digest", tokenDigest)
      .maybeSingle()

    if (verificationError) throw verificationError
    if (!verification) {
      return jsonResponse({ status: "not_found" }, 404, origin)
    }
    if (
      verification.status === "revoked" ||
      verification.revoked_at ||
      !verification.document_id
    ) {
      return jsonResponse({
        schemaVersion: 1,
        status: "revoked",
        issuer: "Somadhan Sign",
        referenceCode: verification.reference_code,
      }, 410, origin)
    }

    const { data: document, error: documentError } = await serviceClient
      .from("documents")
      .select("status, final_pdf_url")
      .eq("id", verification.document_id)
      .maybeSingle()
    if (documentError) throw documentError
    if (
      !document ||
      document.status !== "completed" ||
      document.final_pdf_url !== verification.final_storage_path
    ) {
      return jsonResponse({
        schemaVersion: 1,
        status: "revoked",
        issuer: "Somadhan Sign",
        referenceCode: verification.reference_code,
      }, 410, origin)
    }

    return jsonResponse({
      schemaVersion: 1,
      status: "active",
      issuer: "Somadhan Sign",
      referenceCode: verification.reference_code,
      evidenceSha256: verification.evidence_sha256,
      artifactSha256: verification.artifact_sha256,
      artifactSize: verification.artifact_size,
      hashScheme: verification.hash_scheme,
      completedAt: verification.completed_at,
      issuedAt: verification.issued_at,
    }, 200, origin)
  } catch {
    return jsonResponse({ status: "unavailable" }, 503, origin)
  }
})
