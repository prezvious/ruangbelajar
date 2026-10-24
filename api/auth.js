const {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} = require('node:crypto');

const cookieName = process.env.VERCEL
  ? '__Host-ruang-session'
  : 'ruang-session';
const supabaseUrl =
  process.env.SUPABASE_URL || 'https://ojltoroezahhqgktvygp.supabase.co';
const publishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_8jt6R4iPG2BDRmYllfVGXA_P8-SHxdQ';

function secret() {
  if (
    !process.env.AUTH_COOKIE_SECRET ||
    process.env.AUTH_COOKIE_SECRET.length < 32
  ) {
    throw Object.assign(
      new Error('Layanan akun belum dikonfigurasi. Hubungi pengelola situs.'),
      { status: 503, key: 'http.serverConfig' },
    );
  }
  return createHash('sha256').update(process.env.AUTH_COOKIE_SECRET).digest();
}

function seal(session) {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', secret(), nonce);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(session), 'utf8'),
    cipher.final(),
  ]);
  return Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString(
    'base64url',
  );
}

function readSession(req) {
  const value = (req.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1);
  if (!value) return null;
  const key = secret();
  try {
    const bytes = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      bytes.subarray(0, 12),
    );
    decipher.setAuthTag(bytes.subarray(12, 28));
    const session = JSON.parse(
      Buffer.concat([
        decipher.update(bytes.subarray(28)),
        decipher.final(),
      ]).toString('utf8'),
    );
    if (
      !Number.isFinite(session.deadline) ||
      !Number.isFinite(session.tokenExpires) ||
      !session.accessToken ||
      !session.refreshToken
    )
      return null;
    return session;
  } catch {
    return null;
  }
}

function writeCookie(res, session) {
  const maxAge = session
    ? Math.max(0, Math.floor((session.deadline - Date.now()) / 1000))
    : 0;
  res.setHeader(
    'Set-Cookie',
    `${cookieName}=${session ? seal(session) : ''}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.VERCEL ? '; Secure' : ''}`,
  );
}

function calendarDeadline(months) {
  const date = new Date();
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.getTime();
}

async function supabase(path, body, accessToken) {
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      apikey: publishableKey,
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const messages = {
      invalid_credentials: 'Email atau kata sandi tidak sesuai.',
      email_not_confirmed:
        'Verifikasi email terlebih dahulu melalui tautan di kotak masuk.',
      user_already_exists:
        'Pendaftaran tidak dapat diproses. Coba masuk atau gunakan email lain.',
      weak_password: 'Kata sandi belum memenuhi ketentuan keamanan.',
      otp_expired:
        'Tautan verifikasi sudah kedaluwarsa atau pernah digunakan. Minta tautan baru.',
      over_email_send_rate_limit:
        'Terlalu banyak permintaan email. Tunggu sebentar sebelum mencoba lagi.',
      signup_disabled: 'Pendaftaran akun sedang dinonaktifkan.',
    };
    throw Object.assign(
      new Error(
        response.status === 429
          ? 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.'
          : messages[data.code || data.error_code] ||
            'Permintaan akun gagal. Periksa isian atau coba lagi nanti.',
      ),
      {
        status: response.status >= 500 ? 502 : response.status,
        code: data.code || data.error_code,
        key:
          response.status === 429
            ? 'error.authRate'
            : {
                invalid_credentials: 'error.authCredentials',
                email_not_confirmed: 'error.authUnconfirmed',
                user_already_exists: 'error.authExists',
                weak_password: 'error.authWeak',
                otp_expired: 'verify.rejected',
                over_email_send_rate_limit: 'error.authRate',
                signup_disabled: 'error.authDisabled',
              }[data.code || data.error_code] || 'error.authGeneric',
      },
    );
  }
  return data;
}

function sessionFrom(tokens, deadline) {
  if (!tokens.access_token || !tokens.refresh_token)
    throw Object.assign(
      new Error('Sesi tidak diterima. Silakan masuk kembali.'),
      { status: 401, key: 'error.authExpired' },
    );
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpires: Date.now() + Number(tokens.expires_in || 3600) * 1000,
    deadline,
  };
}

function userResult(user, session) {
  return {
    user: {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name || '',
    },
    expiresAt: session.deadline,
    project: supabaseUrl,
  };
}

async function identity(req, res) {
  let session = readSession(req);
  if (!session || session.deadline <= Date.now())
    throw Object.assign(new Error('Silakan masuk kembali.'), {
      status: 401,
      key: 'error.authExpired',
    });
  if (session.tokenExpires <= Date.now() + 60000) {
    const tokens = await supabase('token?grant_type=refresh_token', {
      refresh_token: session.refreshToken,
    });
    session = sessionFrom(tokens, session.deadline);
    writeCookie(res, session);
  }
  const user = await supabase('user', undefined, session.accessToken);
  if (session.deadline <= Date.now())
    throw Object.assign(new Error('Sesi telah berakhir.'), {
      status: 401,
      key: 'error.authExpired',
    });
  return { user, session };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const send = (status, data) => {
    if (data.error && !data.key)
      data.key =
        status === 405
          ? 'http.method'
          : status === 403
            ? 'http.forbidden'
            : status === 400
              ? 'http.invalid'
              : 'http.request';
    res.statusCode = status;
    res.end(JSON.stringify(data));
  };
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(405, { error: 'Metode tidak diizinkan.' });
  }
  const origin = `${process.env.VERCEL ? 'https' : 'http'}://${req.headers.host}`;
  if (
    req.headers.origin !== origin ||
    !req.headers['content-type']?.startsWith('application/json')
  )
    return send(403, { error: 'Permintaan tidak diizinkan.' });
  try {
    secret();
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || typeof body !== 'object')
      return send(400, { error: 'Isian tidak valid.' });
    const { action } = body;
    const email =
      typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const callback = `${process.env.PUBLIC_SITE_URL || origin}/auth/verify${body.remember === true ? '?remember=1' : ''}`;

    if (
      ['sign-in', 'sign-up', 'resend', 'request-reset'].includes(action) &&
      (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
    )
      return send(400, {
        key: 'http.email',
        error: 'Masukkan alamat email yang valid.',
      });
    if (
      ['sign-in', 'sign-up'].includes(action) &&
      (!password || password.length > 128)
    )
      return send(400, {
        key: 'http.password',
        error: 'Masukkan kata sandi, maksimal 128 karakter.',
      });

    if (action === 'sign-up') {
      const fullName =
        typeof body.fullName === 'string' ? body.fullName.trim() : '';
      if (fullName.length < 2 || fullName.length > 120 || password.length < 8)
        return send(400, {
          key: 'http.signupFields',
          error:
            'Isi nama lengkap (2–120 karakter) dan kata sandi minimal 8 karakter.',
        });
      const tokens = await supabase(
        `signup?redirect_to=${encodeURIComponent(callback)}`,
        { email, password, data: { full_name: fullName } },
      );
      if (tokens.access_token) {
        const session = sessionFrom(
          tokens,
          calendarDeadline(body.remember === true ? 12 : 6),
        );
        writeCookie(res, session);
        return send(200, userResult(tokens.user, session));
      }
      return send(200, { confirmationRequired: true });
    }

    if (action === 'sign-in') {
      const tokens = await supabase('token?grant_type=password', {
        email,
        password,
      });
      const session = sessionFrom(
        tokens,
        calendarDeadline(body.remember === true ? 12 : 6),
      );
      writeCookie(res, session);
      return send(200, userResult(tokens.user, session));
    }

    if (action === 'resend') {
      await supabase(`resend?redirect_to=${encodeURIComponent(callback)}`, {
        type: 'signup',
        email,
      });
      return send(200, { sent: true });
    }

    if (action === 'request-reset') {
      await supabase(`recover?redirect_to=${encodeURIComponent(callback)}`, {
        email,
      });
      return send(200, { sent: true });
    }
    if (action === 'update-password') {
      if (password.length < 8 || password.length > 128)
        return send(400, {
          key: 'http.passwordNew',
          error: 'Kata sandi harus terdiri dari 8–128 karakter.',
        });
      const { session } = await identity(req, res);
      const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          apikey: publishableKey,
          Authorization: `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok)
        return send(400, {
          key: 'http.passwordUpdate',
          error:
            'Kata sandi belum berhasil diperbarui. Periksa ketentuan akun atau minta tautan baru.',
        });
      return send(200, { updated: true });
    }

    if (action === 'verify') {
      let tokens;
      if (
        typeof body.tokenHash === 'string' &&
        body.tokenHash.length <= 512 &&
        ['email', 'recovery'].includes(body.type)
      ) {
        tokens = await supabase('verify', {
          token_hash: body.tokenHash,
          type: body.type,
        });
      } else if (
        typeof body.accessToken === 'string' &&
        typeof body.refreshToken === 'string' &&
        body.accessToken.length < 8000 &&
        body.refreshToken.length < 1024
      ) {
        const user = await supabase('user', undefined, body.accessToken);
        if (!user.email_confirmed_at)
          return send(401, {
            key: 'error.authUnconfirmed',
            error: 'Alamat email belum diverifikasi.',
          });
        tokens = await supabase('token?grant_type=refresh_token', {
          refresh_token: body.refreshToken,
        });
        if (tokens.user?.id !== user.id)
          return send(401, {
            key: 'verify.rejected',
            error: 'Tautan verifikasi tidak valid.',
          });
      } else {
        return send(400, {
          key: 'verify.incomplete',
          error:
            'Tautan verifikasi tidak lengkap. Buka tautan terbaru dari email.',
        });
      }
      const session = sessionFrom(
        tokens,
        calendarDeadline(body.remember === true ? 12 : 6),
      );
      writeCookie(res, session);
      return send(200, userResult(tokens.user, session));
    }

    if (action === 'sign-out') {
      const session = readSession(req);
      writeCookie(res, null);
      if (session) {
        try {
          const tokens =
            session.tokenExpires <= Date.now()
              ? await supabase('token?grant_type=refresh_token', {
                  refresh_token: session.refreshToken,
                })
              : null;
          await supabase(
            'logout?scope=local',
            {},
            tokens?.access_token || session.accessToken,
          );
        } catch {
          return send(200, {
            signedOut: true,
            warning:
              'Keluar dari browser ini berhasil. Pencabutan sesi di server belum dapat dikonfirmasi.',
          });
        }
      }
      return send(200, { signedOut: true });
    }

    if (action === 'session') {
      let session = readSession(req);
      if (!session || session.deadline <= Date.now()) {
        writeCookie(res, null);
        return send(200, {
          user: null,
          expired: Boolean(session),
          project: supabaseUrl,
        });
      }
      try {
        if (session.tokenExpires <= Date.now() + 60000) {
          const tokens = await supabase('token?grant_type=refresh_token', {
            refresh_token: session.refreshToken,
          });
          session = sessionFrom(tokens, session.deadline);
          writeCookie(res, session);
        }
        const user = await supabase('user', undefined, session.accessToken);
        if (session.deadline <= Date.now()) {
          writeCookie(res, null);
          return send(200, { user: null, expired: true });
        }
        return send(200, userResult(user, session));
      } catch (error) {
        if (![400, 401, 403].includes(error.status)) throw error;
        writeCookie(res, null);
        return send(200, { user: null });
      }
    }
    return send(400, { error: 'Aksi tidak dikenal.' });
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : error.status || 503;
    return send(status, {
      key:
        error instanceof SyntaxError
          ? 'http.invalid'
          : error.key || 'error.cloudNetwork',
      error: error.status
        ? error.message
        : 'Layanan akun belum dapat dihubungi. Coba lagi sebentar.',
    });
  }
};
module.exports.sessionTools = { identity, supabaseUrl, publishableKey };
