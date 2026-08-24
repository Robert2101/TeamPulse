import http from 'k6/http';

/**
 * Authenticated GET request.
 * Sets Cookie: token=<jwt> to satisfy protectRoute middleware.
 */
export function authGet(url, token, tags) {
    return http.get(url, {
        headers: { Cookie: 'token=' + token },
        tags: tags || {},
    });
}

/**
 * Authenticated POST with JSON body.
 */
export function authPost(url, body, token, tags) {
    return http.post(url, JSON.stringify(body), {
        headers: {
            'Content-Type': 'application/json',
            Cookie: 'token=' + token,
        },
        tags: tags || {},
    });
}

/**
 * Authenticated PUT with JSON body.
 */
export function authPut(url, body, token, tags) {
    return http.put(url, JSON.stringify(body), {
        headers: {
            'Content-Type': 'application/json',
            Cookie: 'token=' + token,
        },
        tags: tags || {},
    });
}

/**
 * Authenticated PATCH with JSON body.
 */
export function authPatch(url, body, token, tags) {
    return http.patch(url, JSON.stringify(body), {
        headers: {
            'Content-Type': 'application/json',
            Cookie: 'token=' + token,
        },
        tags: tags || {},
    });
}

/**
 * Unauthenticated GET (for error/resilience tests).
 */
export function unauthGet(url, tags) {
    return http.get(url, { tags: tags || {} });
}

/**
 * GET with an intentionally invalid token.
 */
export function badAuthGet(url, tags) {
    return http.get(url, {
        headers: { Cookie: 'token=invalid.jwt.garbage' },
        tags: tags || {},
    });
}
