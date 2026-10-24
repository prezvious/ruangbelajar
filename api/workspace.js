const { identity, supabaseUrl, publishableKey } =
  require('./auth.js').sessionTools;
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const requestId = require('node:crypto').randomUUID();
  res.setHeader('X-Request-ID', requestId);
  const send = (status, data) => {
    if (data.error && !data.key)
      data.key =
        data.code === 'CLOUD_CONFLICT'
          ? 'error.cloudConflict'
          : data.code === 'ACCOUNT_CHANGED'
            ? 'error.accountChanged'
            : status === 405
              ? 'http.method'
              : status === 403
                ? 'http.forbidden'
                : status === 413
                  ? 'http.tooLarge'
                  : status === 400
                    ? 'http.invalid'
                    : 'http.workspace';
    res.statusCode = status;
    if (status >= 500)
      console.error(
        JSON.stringify({
          event: 'workspace_error',
          requestId,
          status,
          code: data.code || data.key,
        }),
      );
    res.end(JSON.stringify({ ...data, requestId }));
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
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || !['read', 'revision', 'save'].includes(body.action))
      return send(400, { error: 'Aksi workspace tidak valid.' });
    if (Buffer.byteLength(JSON.stringify(body)) > 4 * 1024 * 1024)
      return send(413, {
        error:
          'Workspace melebihi batas sinkronisasi 4 MiB. Ekspor cadangan lokal untuk menyimpan seluruh data.',
      });
    const { user, session } = await identity(req, res),
      context = { project: supabaseUrl.replace(/\/$/, ''), userId: user.id };
    if (
      typeof body.expectedUserId !== 'string' ||
      body.expectedUserId !== user.id
    )
      return send(409, {
        error: 'Akun berubah. Muat ulang sebelum menyimpan.',
        code: 'ACCOUNT_CHANGED',
      });
    let path,
      method = 'GET',
      payload;
    if (body.action === 'read' || body.action === 'revision')
      path = `ruang_workspaces?user_id=eq.${encodeURIComponent(user.id)}&select=${body.action === 'revision' ? 'revision' : 'data,revision,updated_at'}`;
    else {
      if (!Number.isSafeInteger(body.revision) || body.revision < 0)
        return send(400, { error: 'Revisi tidak valid.' });
      const { validateState } = await import('../study/core.mjs');
      let data;
      try {
        data = {
          ...validateState(body.data),
          locale: [
            'id-ID',
            'en-GB',
            'en-US',
            'es-ES',
            'fr-FR',
            'ru-RU',
          ].includes(body.data.locale)
            ? body.data.locale
            : 'id-ID',
        };
      } catch {
        return send(400, { error: 'Data workspace tidak valid.' });
      }
      if (body.data?.learning?.version !== 1)
        return send(409, {
          code: 'CLIENT_UPDATE_REQUIRED',
          key: 'learn.updateRequired',
          error: 'Refresh the application before saving this workspace.',
        });
      const { assertCloudCapacity } = await import(
        '../study/learning-model.mjs'
      );
      try {
        assertCloudCapacity(data);
      } catch {
        return send(413, {
          key: 'learn.cloudCapacity',
          error: 'Workspace exceeds cloud capacity. Export a backup.',
        });
      }
      path = 'rpc/save_ruang_workspace';
      method = 'POST';
      payload = {
        p_data: data,
        p_expected_revision: body.revision,
        p_expected_user_id: user.id,
      };
    }
    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      method,
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) {
      if (result?.message?.includes('CLOUD_CONFLICT'))
        return send(409, {
          error: 'Data berubah di perangkat lain.',
          code: 'CLOUD_CONFLICT',
        });
      if (result?.message?.includes('ACCOUNT_CHANGED'))
        return send(409, { error: 'Akun berubah.', code: 'ACCOUNT_CHANGED' });
      return send(502, {
        error:
          'Sinkronisasi belum tersedia. Periksa koneksi dan jalankan supabase-schema.sql pada proyek Ruang Belajar.',
      });
    }
    if (
      (body.action === 'read' || body.action === 'revision') &&
      (!Array.isArray(result) ||
        result.length > 1 ||
        (result.length === 1 &&
          (!result[0] ||
            (body.action === 'read' && !Object.hasOwn(result[0], 'data')) ||
            !Number.isSafeInteger(result[0].revision) ||
            result[0].revision < 1)))
    )
      return send(502, {
        error: 'Respons workspace tidak valid. Data lokal dipertahankan.',
      });
    if (
      body.action === 'save' &&
      (!Number.isSafeInteger(result) || result !== body.revision + 1)
    )
      return send(502, {
        error:
          'Penyimpanan belum dapat dikonfirmasi. Data lokal dipertahankan.',
      });
    return send(
      200,
      body.action === 'revision'
        ? { revision: result?.[0]?.revision || 0, context }
        : body.action === 'read'
          ? { ...(result?.[0] || { data: null, revision: 0 }), context }
          : { revision: result, context },
    );
  } catch (error) {
    return send(error instanceof SyntaxError ? 400 : error.status || 503, {
      key:
        error instanceof SyntaxError
          ? 'http.invalid'
          : error.key || 'http.workspace',
      error: error.status
        ? error.message
        : 'Workspace belum dapat dihubungi. Perubahan tetap tersimpan lokal.',
    });
  }
};
