// The demo workspace is shared by every visitor, so its accounts can't change what would lock
// the next visitor out or empty the demo for everyone. Everything else works as normal, and the
// nightly reset (services/demo.service.js) puts the data back.
export const isDemoUser = (user) => Boolean(user?.workspace?.isDemo);

export const demoLocked = (res, action) => res.status(403).json({
    message: `${action} is turned off for the shared demo accounts. Create your own workspace to try it.`,
});
