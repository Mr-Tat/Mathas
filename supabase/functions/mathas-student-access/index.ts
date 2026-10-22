// Math'as — Edge Function d'AUTORISATION (V0.2, branche de test seulement).
// NON DEPLOYÉE. Requiert la migration étudiée et l'activation contrôlée
// de Supabase Auth Anonymous, après revue RLS et anti-abus.
// Ne jamais mettre la clé service_role ni l'approbation pepper dans GitHub.
// Actions : request_device, device_status, teacher_requests,
// approve_device, refuse_device, revoke_device, issue_launch,
// redeem_launch, check_launch.
// Les scores, publications, alias et synchronisations sont volontairement
// NON implémentés ici : aucune écriture pédagogique avant tests.

import { createClient } from "npm:@supabase/supabase-js@2";

type Payload = Record<string, unknown>;
const URL_SUPA = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PUBLISHABLE_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
// Clé d'empreinte de vérification : secret dédié conseillé. En LAB uniquement,
// repli à partir de la clé serveur prédéfinie (jamais envoyée au navigateur).
const PEPPER = Deno.env.get("MATHAS_APPROVAL_PEPPER") ||
  (SERVICE_KEY ? "mathas-test:approval-code:v1:" + SERVICE_KEY : "");
const allowedOrigin = (origin: string | null) =>
  origin === "https://mr-tat.github.io" ||
  !!origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

function response(data: Payload, status = 200, origin: string | null = null) {
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "vary": "Origin",
  };
  if (allowedOrigin(origin)) {
    headers["access-control-allow-origin"] = origin!;
    headers["access-control-allow-headers"] = "authorization, apikey, content-type, x-client-info";
    headers["access-control-allow-methods"] = "POST, OPTIONS";
  }
  return new Response(JSON.stringify(data), { status, headers });
}
class HttpError extends Error {
  constructor(public code: string, public status = 400) {
    super(code);
  }
}
function required(ok: unknown, code: string, status = 400): asserts ok {
  if (!ok) throw new HttpError(code, status);
}
function textField(data: Payload, key: string, min: number, max: number) {
  const val = data[key];
  required(typeof val === "string" && val.length >= min && val.length <= max, "invalid_" + key);
  return val as string;
}
function uuid(value: unknown) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
function bytesHex(count: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(count));
  return Array.from(bytes, x => x.toString(16).padStart(2, "0")).join("");
}
async function hashString(input: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(bytes), x => x.toString(16).padStart(2, "0")).join("");
}
const soon = (minutes: number) => new Date(Date.now() + minutes * 60000).toISOString();
const ISO_NOW = () => new Date().toISOString();

// V0.3 LAB: short human-readable comparison code. No reversible code in DB.
// HMAC with a server-only key makes it reproducible for the teacher and the
// requesting student, while the database keeps only a peppered hash.
async function fourDigitCode(requestId: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(PEPPER),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key,
    new TextEncoder().encode("mathas-device-approval-v2:" + requestId)));
  const value = new DataView(sig.buffer, sig.byteOffset, sig.byteLength).getUint32(0);
  return String(value % 10000).padStart(4, "0");
}
async function matchingV2Code(r: { id: string; verification_code_hash: string }): Promise<string | null> {
  const code = await fourDigitCode(r.id);
  const hash = await hashString(r.id + ":" + code + ":" + PEPPER);
  return hash === r.verification_code_hash ? code : null;
}

Deno.serve(async req => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return response({ ok: true }, 200, origin);
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405, origin);
  try {
    // Prévenir un déploiement accidentel sur le projet principal.
    required(URL_SUPA === "https://bzdflehyuowbawdzuawh.supabase.co",
      "mathas_test_only", 503);
    required(URL_SUPA && SERVICE_KEY && PUBLISHABLE_KEY && PEPPER.length >= 32, "server_not_configured", 503);
    required(Number(req.headers.get("content-length") ?? "0") < 16384, "body_too_large", 413);
    const raw = await req.text();
    required(raw.length < 16000, "body_too_large", 413);
    let body: Payload;
    try { body = JSON.parse(raw) as Payload; } catch { throw new HttpError("invalid_json"); }
    required(body !== null && typeof body === "object" && !Array.isArray(body), "invalid_body");
    const action = textField(body, "action", 3, 40);
    // Le pilote actuel n'autorise QUE l'enrôlement contrôlé.
    // Aucun lancement de jeu ni transmission de score avant validation E2E.
    required(["request_device","device_status","teacher_requests",
      "approve_device","refuse_device","revoke_device"].includes(action),
      "pilot_action_disabled", 403);
    const bearer = req.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
    required(!!bearer, "auth_required", 401);
    const admin = createClient(URL_SUPA, SERVICE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const authClient = createClient(URL_SUPA, PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: auth, error: authError } = await authClient.auth.getUser(bearer);
    required(!authError && !!auth?.user, "invalid_session", 401);
    const caller = auth.user;
    const uid = caller.id;
    async function teacher() {
      const { data, error } = await admin.from("teacher_users")
        .select("user_id").eq("user_id", uid).maybeSingle();
      required(!error && !!data, "teacher_required", 403);
    }
    async function approvedDevice() {
      const { data: link, error } = await admin.from("mathas_device_authorizations")
        .select("id,student_id,auth_user_id,revoked_at")
        .eq("auth_user_id", uid).is("revoked_at", null).maybeSingle();
      required(!error && !!link, "device_not_authorized", 403);
      const { data: student, error: e2 } = await admin.from("mathas_students")
        .select("id,login_name,first_name,private_display_name,approved_public_alias,avatar_kind,avatar_value,avatar_color,public_opt_in,account_status")
        .eq("id", link.student_id).eq("account_status", "active").maybeSingle();
      required(!e2 && !!student, "student_inactive", 403);
      // V1.9.7 LAB: class label returned with the existing approved-device
      // response, without an additional request from the HUB browser.
      // No group data is exposed unless the current device is authorized.
      const { data: groupLink, error: groupError } = await admin
        .from("mathas_student_group_memberships")
        .select("mathas_student_groups(display_name,active)")
        .eq("student_id", link.student_id)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1).maybeSingle();
      required(!groupError, "group_lookup_failed", 500);
      const grp = groupLink?.mathas_student_groups as
        | { display_name?: string; active?: boolean } | null | undefined;
      return { link, student: {
        ...student,
        class_display_name: grp?.active ? (grp.display_name ?? null) : null
      } };
    }
    async function approvedApplication(appId: number) {
      required(Number.isSafeInteger(appId) && appId > 0, "invalid_application");
      const { data: settings, error } = await admin.from("mathas_application_settings")
        .select("ownership,result_tracking,application_id")
        .eq("application_id", appId).maybeSingle();
      required(!error && settings?.ownership === "mathas" &&
        (settings.result_tracking === "complet" || settings.result_tracking === "pedagogique"),
        "app_not_integrated", 403);
      const { data: app, error: appError } = await admin.from("applications")
        .select("id,url,actif").eq("id", appId).maybeSingle();
      required(!appError && app?.actif, "app_inactive", 403);
      const url = new URL(app.url);
      required(url.protocol === "https:" && url.hostname === "mr-tat.github.io", "external_app", 403);
      return app;
    }
    // Anonymous Auth clients NEVER inherit a teacher's session, even on the
    // same GitHub Pages origin; teacher.js and student clients use separate keys.
    if (action === "request_device") {
      required(caller.is_anonymous === true, "anonymous_session_required", 403);
      const login = textField(body, "login", 3, 64).toLowerCase().trim();
      required(/^[a-z0-9][a-z0-9._-]{1,63}$/.test(login), "invalid_login");
      const { data: current } = await admin.from("mathas_device_authorizations")
        .select("student_id,revoked_at").eq("auth_user_id", uid).maybeSingle();
      required(!current, "identity_already_used_renew_anonymous_auth", 409);
      const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countErr } = await admin.from("mathas_device_requests")
        .select("id", { count: "exact", head: true }).eq("auth_user_id", uid).gte("requested_at", windowStart);
      required(!countErr && (count ?? 100) < 3, "too_many_requests", 429);
      await admin.from("mathas_device_requests")
        .update({ status: "cancelled", reviewed_at: ISO_NOW() })
        .eq("auth_user_id", uid).eq("status", "pending");
      // Four-digit code is only returned to its owner and an authenticated teacher.
      // The teacher must still compare it with the student's screen before approval.
      const requestId = crypto.randomUUID();
      const code = await fourDigitCode(requestId);
      const codeHash = await hashString(requestId + ":" + code + ":" + PEPPER);
      const { error } = await admin.from("mathas_device_requests").insert({
        id: requestId, auth_user_id: uid, claimed_login: login,
        verification_code_hash: codeHash, expires_at: soon(10),
      });
      required(!error, "request_failed", 500);
      return response({ ok: true, requestId, verificationCode: code, expiresInSeconds: 600 }, 200, origin);
    }
    if (action === "device_status") {
      const { data: device, error } = await admin.from("mathas_device_authorizations")
        .select("student_id").eq("auth_user_id", uid).is("revoked_at", null).maybeSingle();
      required(!error, "lookup_failed", 500);
      if (device) {
        const { student } = await approvedDevice();
        return response({ ok: true, status: "approved", student }, 200, origin);
      }
      const { data: pending } = await admin.from("mathas_device_requests")
        .select("id,claimed_login,expires_at,verification_code_hash").eq("auth_user_id", uid)
        .eq("status", "pending").gte("expires_at", ISO_NOW())
        .order("requested_at", { ascending: false }).limit(1).maybeSingle();
      const pupilCode = pending ? await matchingV2Code(pending) : null;
      return response({ ok: true, status: pending ? "pending" : "unregistered",
        requestId: pending?.id ?? null, login: pending?.claimed_login ?? null,
        verificationCode: pupilCode }, 200, origin);
    }
    if (action === "teacher_requests") {
      await teacher();
      const { data, error } = await admin.from("mathas_device_requests")
        .select("id,claimed_login,requested_at,expires_at,verification_code_hash")
        .eq("status", "pending").gte("expires_at", ISO_NOW())
        .order("requested_at", { ascending: true }).limit(100);
      required(!error, "lookup_failed", 500);
      const requests = await Promise.all((data ?? []).map(async r => ({
        id: r.id,
        claimed_login: r.claimed_login,
        requested_at: r.requested_at,
        expires_at: r.expires_at,
        verificationCode: await matchingV2Code(r),
      })));
      return response({ ok: true, requests }, 200, origin);
    }
    if (action === "approve_device") {
      await teacher();
      const requestId = textField(body, "requestId", 36, 36);
      const code = textField(body, "verificationCode", 4, 4);
      required(uuid(requestId) && /^\d{4}$/.test(code), "invalid_code");
      // The atomic database function counts all incorrect attempts and enforces
      // the five-attempt limit. Never bypass that counter with a pre-check.
      // Le nombre d'échecs et la comparaison sont gérés avec verrou
      // dans la même transaction SQL : pas de read-modify-write concurrent.
      const correct = await hashString(requestId + ":" + code + ":" + PEPPER);
      // Transaction serveur : l'enseignant est contrôlé dans la fonction SQL,
      // ainsi que le code et tous les liens d'identité/appareil.
      const firstName = typeof body.firstName === "string" ? body.firstName : null;
      const initial = typeof body.surnameInitial === "string" ? body.surnameInitial : null;
      const groupId = body.groupId === null || body.groupId === undefined ? null : body.groupId;
      required(groupId === null || uuid(groupId), "invalid_group");
      const { data: approval, error: rpcError } = await admin.rpc("mathas_approve_device_atomic", {
        p_teacher_id: uid,
        p_request_id: requestId,
        p_code_hash: correct,
        p_first_name: firstName,
        p_initial: initial,
        p_group_id: groupId,
      });
      required(!rpcError && approval, "approval_transaction_failed", 500);
      required(approval.ok === true, String(approval.code || "approval_denied"), 403);
      return response({ ok: true, approved: true, studentId: approval.studentId }, 200, origin);
    }
    if (action === "refuse_device") {
      await teacher();
      const requestId = textField(body, "requestId", 36, 36);
      required(uuid(requestId), "invalid_request_id");
      const { error } = await admin.from("mathas_device_requests")
        .update({ status: "refused", reviewed_at: ISO_NOW(), reviewed_by: uid })
        .eq("id", requestId).eq("status", "pending");
      required(!error, "refusal_failed", 500);
      return response({ ok: true }, 200, origin);
    }
    if (action === "revoke_device") {
      await teacher();
      const authorizationId = textField(body, "authorizationId", 36, 36);
      required(uuid(authorizationId), "invalid_authorization_id");
      const { error } = await admin.from("mathas_device_authorizations")
        .update({ revoked_at: ISO_NOW() }).eq("id", authorizationId).is("revoked_at", null);
      required(!error, "revocation_failed", 500);
      // Invalidate any active launch sessions for this technical identity.
      // Future API writes always check revoked_at too.
      return response({ ok: true }, 200, origin);
    }
    if (action === "issue_launch") {
      const { student } = await approvedDevice();
      const appId = Number(body.applicationId);
      await approvedApplication(appId);
      const ticket = bytesHex(32);
      const ticketHash = await hashString(ticket);
      const { error } = await admin.from("mathas_launch_tickets").insert({
        ticket_hash: ticketHash, auth_user_id: uid, student_id: student.id,
        application_id: appId, expires_at: soon(1),
      });
      required(!error, "launch_failed", 500);
      return response({ ok: true, ticket, expiresInSeconds: 60 }, 200, origin);
    }
    if (action === "redeem_launch") {
      const { student } = await approvedDevice();
      const appId = Number(body.applicationId);
      await approvedApplication(appId);
      const ticket = textField(body, "ticket", 64, 64);
      required(/^[0-9a-f]{64}$/.test(ticket), "invalid_ticket");
      const hash = await hashString(ticket);
      const { data: redeemed, error } = await admin.from("mathas_launch_tickets")
        .update({ redeemed_at: ISO_NOW() })
        .eq("ticket_hash", hash).eq("auth_user_id", uid)
        .eq("student_id", student.id).eq("application_id", appId)
        .is("redeemed_at", null).gt("expires_at", ISO_NOW())
        .select("id").maybeSingle();
      required(!error && redeemed, "ticket_expired_or_used", 403);
      const launchSecret = bytesHex(32);
      const { error: launchErr } = await admin.from("mathas_launch_sessions").insert({
        session_hash: await hashString(launchSecret), auth_user_id: uid,
        student_id: student.id, application_id: appId, expires_at: soon(180),
      });
      required(!launchErr, "session_create_failed", 500);
      return response({ ok: true, launchSecret, expiresInSeconds: 10800,
        student: { id: student.id, displayName: student.private_display_name, avatar: student.avatar_value } }, 200, origin);
    }
    if (action === "check_launch") {
      const { student } = await approvedDevice();
      const appId = Number(body.applicationId);
      await approvedApplication(appId);
      const secret = textField(body, "launchSecret", 64, 64);
      required(/^[0-9a-f]{64}$/.test(secret), "invalid_launch_secret");
      const { data: session, error } = await admin.from("mathas_launch_sessions")
        .select("id").eq("session_hash", await hashString(secret))
        .eq("auth_user_id", uid).eq("student_id", student.id)
        .eq("application_id", appId).is("revoked_at", null)
        .gt("expires_at", ISO_NOW()).maybeSingle();
      required(!error && !!session, "launch_not_authorized", 403);
      return response({ ok: true, authorized: true,
        student: { id: student.id, displayName: student.private_display_name, avatar: student.avatar_value } }, 200, origin);
    }
    throw new HttpError("unknown_action", 404);
  } catch (e) {
    if (e instanceof HttpError) return response({ ok: false, error: e.code }, e.status, origin);
    console.error("Mathas student access unexpected failure:", e);
    return response({ ok: false, error: "internal_error" }, 500, origin);
  }
});
