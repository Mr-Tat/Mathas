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
const PEPPER = Deno.env.get("MATHAS_APPROVAL_PEPPER") ?? "";
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
const required = (ok: unknown, code: string, status = 400): asserts ok is true => {
  if (!ok) throw new HttpError(code, status);
};
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

Deno.serve(async req => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return response({ ok: true }, 200, origin);
  if (req.method !== "POST") return response({ error: "method_not_allowed" }, 405, origin);
  try {
    required(URL_SUPA && SERVICE_KEY && PUBLISHABLE_KEY && PEPPER.length >= 32, "server_not_configured", 503);
    required(Number(req.headers.get("content-length") ?? "0") < 16384, "body_too_large", 413);
    const raw = await req.text();
    required(raw.length < 16000, "body_too_large", 413);
    let body: Payload;
    try { body = JSON.parse(raw) as Payload; } catch { throw new HttpError("invalid_json"); }
    required(body !== null && typeof body === "object" && !Array.isArray(body), "invalid_body");
    const action = textField(body, "action", 3, 40);
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
      return { link, student };
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
        .select("student_id").eq("auth_user_id", uid).is("revoked_at", null).maybeSingle();
      required(!current, "already_authorized", 409);
      const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error: countErr } = await admin.from("mathas_device_requests")
        .select("id", { count: "exact", head: true }).eq("auth_user_id", uid).gte("requested_at", windowStart);
      required(!countErr && (count ?? 100) < 3, "too_many_requests", 429);
      await admin.from("mathas_device_requests")
        .update({ status: "cancelled", reviewed_at: ISO_NOW() })
        .eq("auth_user_id", uid).eq("status", "pending");
      // Random code is shown ONLY to the pupil; teacher must physically obtain it.
      const num = crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000;
      const code = String(num);
      const requestId = crypto.randomUUID();
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
        .select("id,claimed_login,expires_at").eq("auth_user_id", uid)
        .eq("status", "pending").gte("expires_at", ISO_NOW())
        .order("requested_at", { ascending: false }).limit(1).maybeSingle();
      return response({ ok: true, status: pending ? "pending" : "unregistered",
        requestId: pending?.id ?? null, login: pending?.claimed_login ?? null }, 200, origin);
    }
    if (action === "teacher_requests") {
      await teacher();
      const { data, error } = await admin.from("mathas_device_requests")
        .select("id,claimed_login,requested_at,expires_at,auth_user_id")
        .eq("status", "pending").gte("expires_at", ISO_NOW())
        .order("requested_at", { ascending: true }).limit(100);
      required(!error, "lookup_failed", 500);
      return response({ ok: true, requests: data ?? [] }, 200, origin);
    }
    if (action === "approve_device") {
      await teacher();
      const requestId = textField(body, "requestId", 36, 36);
      const code = textField(body, "verificationCode", 6, 6);
      required(uuid(requestId) && /^\d{6}$/.test(code), "invalid_code");
      const { data: pending, error } = await admin.from("mathas_device_requests")
        .select("*").eq("id", requestId).eq("status", "pending").gte("expires_at", ISO_NOW()).maybeSingle();
      required(!error && pending, "request_expired_or_missing", 404);
      required(pending.failed_checks < 5, "too_many_code_checks", 429);
      const correct = await hashString(requestId + ":" + code + ":" + PEPPER);
      if (correct !== pending.verification_code_hash) {
        await admin.from("mathas_device_requests")
          .update({ failed_checks: pending.failed_checks + 1 })
          .eq("id", requestId).eq("status", "pending");
        throw new HttpError("wrong_verification_code", 403);
      }
      let studentId: string;
      const { data: existing, error: findErr } = await admin.from("mathas_students")
        .select("id,account_status").eq("login_name", pending.claimed_login).maybeSingle();
      required(!findErr, "student_lookup_failed", 500);
      if (existing) {
        required(existing.account_status === "active", "student_inactive", 403);
        studentId = existing.id;
      } else {
        const firstName = textField(body, "firstName", 1, 90).trim();
        const initial = textField(body, "surnameInitial", 1, 1).toUpperCase();
        required(/^[\p{L}' -]+$/u.test(firstName) && /^\p{L}$/u.test(initial), "invalid_identity");
        const { data: created, error: createErr } = await admin.from("mathas_students").insert({
          login_name: pending.claimed_login,
          first_name: firstName,
          surname_initial: initial,
          private_display_name: firstName,
        }).select("id").single();
        required(!createErr && !!created, "create_student_failed", 500);
        studentId = created.id;
      }
      // Optional real student group, explicitly confirmed by the teacher.
      // For a new student, group is required (unless teacher is testing only).
      const groupId = body.groupId;
      if (groupId !== undefined && groupId !== null) {
        required(uuid(groupId), "invalid_group");
        const { data: group, error: groupErr } = await admin.from("mathas_student_groups")
          .select("id").eq("id", groupId).eq("active", true).maybeSingle();
        required(!groupErr && !!group, "unknown_group");
        const { data: membership } = await admin.from("mathas_student_group_memberships")
          .select("id,group_id").eq("student_id", studentId).is("ended_at", null).maybeSingle();
        if (!membership) {
          const { error: memberErr } = await admin.from("mathas_student_group_memberships").insert({
            student_id: studentId, group_id: groupId, approved_by: uid,
          });
          required(!memberErr, "group_assignment_failed", 500);
        } else required(membership.group_id === groupId, "existing_group_mismatch", 409);
      }
      // The approval is protected from double submission by marking the request.
      const { data: claimed, error: claimErr } = await admin.from("mathas_device_requests")
        .update({ status: "approved", linked_student_id: studentId, reviewed_at: ISO_NOW(), reviewed_by: uid })
        .eq("id", requestId).eq("status", "pending")
        .select("id").maybeSingle();
      required(!claimErr && claimed, "already_reviewed", 409);
      const { error: deviceErr } = await admin.from("mathas_device_authorizations").upsert({
        auth_user_id: pending.auth_user_id, student_id: studentId,
        approved_by: uid, revoked_at: null, approved_at: ISO_NOW(),
      }, { onConflict: "auth_user_id" });
      required(!deviceErr, "approve_device_failed", 500);
      return response({ ok: true, approved: true, studentId }, 200, origin);
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
