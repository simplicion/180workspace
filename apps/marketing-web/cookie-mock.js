import * as cookie from '../../node_modules/cookie/index.js';

export const parseCookie = cookie.parse || cookie.parseCookie || (cookie.default && cookie.default.parse);
export const stringifySetCookie = cookie.serialize || cookie.stringifySetCookie || (cookie.default && cookie.default.serialize);
export const parse = cookie.parse || (cookie.default && cookie.default.parse);
export const serialize = cookie.serialize || (cookie.default && cookie.default.serialize);

export default cookie;
