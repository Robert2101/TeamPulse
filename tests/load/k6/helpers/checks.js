import { check } from 'k6';
import {
    successfulRequests,
    failedRequests,
    businessSuccessRate,
} from './metrics.js';

/**
 * Validate response status and update custom metrics.
 * Returns true if all checks passed.
 */
export function checkResponse(res, name, expectedStatus) {
    if (expectedStatus === undefined) { expectedStatus = 200; }

    var passed = check(res, {
        [name + ': status ' + expectedStatus]: function (r) {
            return r.status === expectedStatus;
        },
    });

    if (passed) {
        successfulRequests.add(1);
        businessSuccessRate.add(1);
    } else {
        failedRequests.add(1);
        businessSuccessRate.add(0);
        if (res.status !== expectedStatus) {
            console.warn(
                '⚠️  ' + name + ': expected ' + expectedStatus +
                ' got ' + res.status + ' — ' +
                (res.body ? res.body.substring(0, 200) : '(empty body)')
            );
        }
    }

    return passed;
}

/**
 * Check that the response body is a JSON array.
 */
export function checkJsonArray(res, name) {
    return check(res, {
        [name + ': body is JSON array']: function (r) {
            try {
                var body = r.json();
                return Array.isArray(body);
            } catch (e) {
                return false;
            }
        },
    });
}

/**
 * Check that a specific JSON field exists in the response.
 */
export function checkHasField(res, name, field) {
    return check(res, {
        [name + ': has field "' + field + '"']: function (r) {
            try {
                return r.json(field) !== undefined && r.json(field) !== null;
            } catch (e) {
                return false;
            }
        },
    });
}
