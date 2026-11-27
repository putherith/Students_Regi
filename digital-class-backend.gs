/* Independent Digital Class credentials and sessions. Student identity is read
 * from the master Students tab; this bridge never writes student records. */
const DIGITAL_CLASS_NONCE_PREFIX = "digital-class-result:";
const DIGITAL_CLASS_ADMIN_PROPERTY = "DIGITAL_CLASS_ADMIN_CREDENTIAL_V1";
const DIGITAL_CLASS_TEACHER_PREFIX = "DIGITAL_CLASS_TEACHER_CREDENTIAL_V1:";
const DIGITAL_CLASS_SESSION_PREFIX = "digital-class-session:";
const DIGITAL_CLASS_SESSION_SECONDS = 21600;
const DIGITAL_CLASS_SETUP_PROPERTY = "DIGITAL_CLASS_SETUP_CODE_V1";
const DIGITAL_CLASS_SETUP_SECONDS = 86400;

/** Run from the Apps Script editor (script owner only): creates a one-time
 * management setup code, valid 24 hours, and prints it to the execution log.
 * Use it for the first admin password or to reset a forgotten one. Digital
 * Class management does not depend on Teacher Portal. */
function createDigitalClassSetupCode() {
  const code = Utilities.getUuid().replace(/-/g, "").slice(0, 10).toUpperCase();
  const salt = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty(DIGITAL_CLASS_SETUP_PROPERTY, JSON.stringify({
    salt:salt, hash:digitalClassHash_(code, salt), expiresAt:Date.now() + DIGITAL_CLASS_SETUP_SECONDS * 1000 }));
  Logger.log("Digital Class setup code (one use, valid 24 hours): " + code);
  return code;
}

function digitalClassUseSetupCode_(code) {
  const cache = CacheService.getScriptCache();
  const throttleKey = "digital-class-setup-fails";
  const failures = Number(cache.get(throttleKey) || 0);
  if (failures >= 10) throw new Error("សាកលេខកូដច្រើនដងពេក។ សូមរង់ចាំ ១៥ នាទី");
  const properties = PropertiesService.getScriptProperties();
  const raw = properties.getProperty(DIGITAL_CLASS_SETUP_PROPERTY);
  const setup = raw ? JSON.parse(raw) : null;
  if (!setup || Number(setup.expiresAt) < Date.now()) {
    if (setup) properties.deleteProperty(DIGITAL_CLASS_SETUP_PROPERTY);
    throw new Error("មិនមានលេខកូដរៀបចំសុពលភាព។ សូមឱ្យម្ចាស់ Apps Script ដំណើរការ createDigitalClassSetupCode");
  }
  const supplied = String(code || "").trim().toUpperCase();
  if (!supplied || supplied.length > 40 || digitalClassHash_(supplied, setup.salt) !== setup.hash) {
    cache.put(throttleKey, String(failures + 1), 900);
    throw new Error("លេខកូដរៀបចំមិនត្រឹមត្រូវ");
  }
  cache.remove(throttleKey);
  properties.deleteProperty(DIGITAL_CLASS_SETUP_PROPERTY);
}

function digitalClassGet_(action, e) {
  const params = e && e.parameter || {};
  if (action === "digitalclassstatus") return output_({ ok:true, version:2, readOnly:true,
    setupRequired:!digitalClassCredential_("admin", "") }, e);
  if (action === "digitalclassclasses") {
    return output_({ ok:true, classes:portalClasses_().map(function(item) {
      return { className:item.className, count:item.count };
    }) }, e);
  }
  if (action === "digitalclassclaim") {
    const nonce = digitalClassNonce_(params.nonce);
    const cache = CacheService.getScriptCache();
    const key = DIGITAL_CLASS_NONCE_PREFIX + nonce;
    const saved = cache.get(key);
    if (!saved) throw new Error("សំណើផុតកំណត់ ឬមិនបានទទួល");
    cache.remove(key);
    return output_(JSON.parse(saved), e);
  }
  const session = digitalClassSession_(params.token, false);
  if (action === "digitalclassrevision") {
    return output_({ ok:true, revision:getRevision_(DATA_REVISION_PROPERTY) }, e);
  }
  if (action === "digitalclasscredentials") {
    digitalClassRequireAdmin_(session);
    const admin = digitalClassCredential_("admin", "");
    return output_({ ok:true, adminUpdatedAt:admin && admin.updatedAt || "",
      classes:portalClasses_().map(function(item) {
        const credential = digitalClassCredential_("teacher", item.className);
        return { className:item.className, configured:!!credential,
          updatedAt:credential && credential.updatedAt || "" };
      }) }, e);
  }
  if (action === "digitalclassroster") {
    const allowed = session.scope === "admin" ? null : session.className;
    const classes = portalClasses_().filter(function(item) {
      return !allowed || item.className === allowed;
    }).map(function(item) { return { className:item.className, students:[] }; });
    const byClass = {};
    classes.forEach(function(item) { byClass[item.className] = item.students; });
    const sheet = getStudentsSheet_();
    const count = Math.max(0, sheet.getLastRow() - 1);
    if (count) {
      // The photo column is never read or sent. Keep large school rosters light.
      const rows = sheet.getRange(2, 1, count, 14).getDisplayValues();
      const guardians = sheet.getRange(2, HEADERS.indexOf("guardianName") + 1, count, 1).getDisplayValues();
      rows.forEach(function(row, index) {
        const cls = String(row[5] || "").trim();
        const id = String(row[0] || "").trim();
        if (!id || !Object.prototype.hasOwnProperty.call(byClass, cls)) return;
        byClass[cls].push({ id:id, studentCode:String(row[1] || ""), studentName:String(row[2] || ""),
          gender:String(row[3] || ""), dob:String(row[4] || ""), className:cls,
          contact:String(row[11] || ""), fatherName:String(row[12] || ""), motherName:String(row[13] || ""),
          guardianName:String(guardians[index][0] || "") });
      });
    }
    return output_({ ok:true, role:session.scope, className:allowed || "", classes:classes,
      revision:getRevision_(DATA_REVISION_PROPERTY) }, e);
  }
  throw new Error("Unknown digital class action");
}

function digitalClassPost_(action, body, e) {
  const nonce = digitalClassNonce_(body.nonce);
  let result;
  try {
    if (action === "digitalclassbootstrap") {
      const lock = LockService.getScriptLock();
      lock.waitLock(30000);
      try {
        // A one-time code from the script owner proves management authority.
        // Validate the new password first so a typo does not burn the code.
        const password = String(body.newPin || "").trim();
        if (password.length < 8 || password.length > 80) throw new Error("លេខសម្ងាត់ត្រូវមាន ៨–៨០ តួអក្សរ");
        digitalClassUseSetupCode_(body.setupCode);
        digitalClassSetCredential_("admin", "", body.newPin);
        result = digitalClassLogin_("admin", "", body.newPin);
      } finally { lock.releaseLock(); }
    } else if (action === "digitalclasslogin") {
      result = digitalClassLogin_(body.role, body.className, body.pin);
    } else if (action === "digitalclasssetpassword") {
      digitalClassSession_(body.token, true);
      const role = String(body.role || "");
      const className = role === "admin" ? "" : String(body.className || "").trim();
      digitalClassAssertTarget_(role, className);
      digitalClassSetCredential_(role, className, body.newPin);
      result = { ok:true, role:role, className:className, updatedAt:new Date().toISOString() };
    } else if (action === "digitalclassremovepassword") {
      digitalClassSession_(body.token, true);
      const className = String(body.className || "").trim();
      digitalClassAssertTarget_("teacher", className);
      PropertiesService.getScriptProperties().deleteProperty(digitalClassCredentialKey_("teacher", className));
      result = { ok:true, className:className, removed:true };
    } else if (action === "digitalclasslogout") {
      const token = String(body.token || "").trim();
      if (/^[0-9a-f-]{72}$/.test(token)) CacheService.getScriptCache().remove(DIGITAL_CLASS_SESSION_PREFIX + token);
      result = { ok:true };
    } else {
      throw new Error("Unknown digital class action");
    }
  } catch (error) {
    result = { ok:false, error:String(error && error.message || error) };
  }
  CacheService.getScriptCache().put(DIGITAL_CLASS_NONCE_PREFIX + nonce, JSON.stringify(result), 60);
  return output_({ ok:true }, e);
}

function digitalClassLogin_(role, className, pin) {
  const scope = String(role || "");
  const cls = scope === "admin" ? "" : String(className || "").trim();
  digitalClassAssertTarget_(scope, cls);
  const supplied = String(pin || "").trim();
  const cache = CacheService.getScriptCache();
  const throttleKey = "digital-class-fails:" + digitalClassHash_(scope + ":" + cls, "throttle").slice(0, 30);
  const failures = Number(cache.get(throttleKey) || 0);
  if (failures >= 10) throw new Error("សាកលេខសម្ងាត់ច្រើនដងពេក។ សូមរង់ចាំ ១៥ នាទី");
  const credential = digitalClassCredential_(scope, cls);
  if (!credential || !supplied || supplied.length > 80 ||
      digitalClassHash_(supplied, credential.salt) !== credential.hash) {
    cache.put(throttleKey, String(failures + 1), 900);
    throw new Error("លេខសម្ងាត់មិនត្រឹមត្រូវ ឬថ្នាក់មិនទាន់បានកំណត់");
  }
  cache.remove(throttleKey);
  const token = Utilities.getUuid() + Utilities.getUuid();
  cache.put(DIGITAL_CLASS_SESSION_PREFIX + token,
    JSON.stringify({ scope:scope, className:cls, credentialHash:credential.hash }),
    DIGITAL_CLASS_SESSION_SECONDS);
  return { ok:true, token:token, role:scope, className:cls, expiresIn:DIGITAL_CLASS_SESSION_SECONDS };
}

function digitalClassSession_(token, adminOnly) {
  const key = String(token || "").trim();
  if (!/^[0-9a-f-]{72}$/.test(key)) throw new Error("សូមចូល Digital Class ម្តងទៀត");
  const saved = CacheService.getScriptCache().get(DIGITAL_CLASS_SESSION_PREFIX + key);
  if (!saved) throw new Error("Session ផុតកំណត់។ សូមចូលម្ដងទៀត");
  const session = JSON.parse(saved);
  const credential = digitalClassCredential_(session.scope, session.className);
  if (!credential || credential.hash !== session.credentialHash)
    throw new Error("លេខសម្ងាត់ត្រូវបានប្ដូរ។ សូមចូលម្ដងទៀត");
  if (adminOnly) digitalClassRequireAdmin_(session);
  return session;
}

function digitalClassRequireAdmin_(session) {
  if (session.scope !== "admin") throw new Error("ត្រូវការសិទ្ធិគណៈគ្រប់គ្រង Digital Class");
}

function digitalClassAssertTarget_(role, className) {
  if (role !== "admin" && role !== "teacher") throw new Error("តួនាទីមិនត្រឹមត្រូវ");
  if (role === "teacher" && !portalClasses_().some(function(item) { return item.className === className; }))
    throw new Error("មិនមានថ្នាក់នេះទេ");
}

function digitalClassSetCredential_(role, className, pin) {
  const password = String(pin || "").trim();
  if (password.length < 8 || password.length > 80) throw new Error("លេខសម្ងាត់ត្រូវមាន ៨–៨០ តួអក្សរ");
  const salt = Utilities.getUuid();
  PropertiesService.getScriptProperties().setProperty(digitalClassCredentialKey_(role, className),
    JSON.stringify({ salt:salt, hash:digitalClassHash_(password, salt), updatedAt:new Date().toISOString() }));
}

function digitalClassCredential_(role, className) {
  const raw = PropertiesService.getScriptProperties().getProperty(digitalClassCredentialKey_(role, className));
  return raw ? JSON.parse(raw) : null;
}

function digitalClassCredentialKey_(role, className) {
  return role === "admin" ? DIGITAL_CLASS_ADMIN_PROPERTY :
    DIGITAL_CLASS_TEACHER_PREFIX + encodeURIComponent(String(className || ""));
}

function digitalClassHash_(value, salt) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ":" + value)
    .map(function(byte) { return ("0" + (byte & 255).toString(16)).slice(-2); }).join("");
}

function digitalClassNonce_(value) {
  const nonce = String(value || "");
  if (!/^[a-f0-9]{64}$/.test(nonce)) throw new Error("Invalid login request");
  return nonce;
}
