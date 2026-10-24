// Loaded only by the isolated HTTP regression test. No external requests.
globalThis.fetch = async (_url, options) => {
  const body = JSON.parse(options.body);
  return Response.json({
    access_token: 'fixture-access',
    refresh_token: 'fixture-refresh',
    expires_in: 3600,
    user: {
      id: 'fixture-user',
      email: body.email,
      user_metadata: { full_name: body.data?.full_name },
    },
  });
};
