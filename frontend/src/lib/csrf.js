// CSRF token for the current session. The API returns it in auth responses (login, check-auth,
// profile) and expects it back as X-CSRF-Token on every state-changing request.
let csrfToken = null;

export const setCsrfToken = (token) => {
    csrfToken = token || null;
};

export const csrfHeaders = () => (csrfToken ? { "X-CSRF-Token": csrfToken } : {});

/** Sends the token with every request and picks up fresh ones from responses. */
export const withCsrf = (instance) => {
    instance.interceptors.request.use((config) => {
        if (csrfToken) config.headers["X-CSRF-Token"] = csrfToken;
        return config;
    });
    instance.interceptors.response.use((res) => {
        if (res.data?.csrfToken) setCsrfToken(res.data.csrfToken);
        return res;
    });
    return instance;
};
