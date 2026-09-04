/*!
 * Pure ESM Cookie parser and serializer for Vite / Astro compatibility
 */

const __toString = Object.prototype.toString;
const __hasOwnProperty = Object.prototype.hasOwnProperty;
const cookieNameRegExp = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const cookieValueRegExp = /^("?)[\u0021\u0023-\u002B\u002D-\u003A\u003C-\u005B\u005D-\u007E]*\1$/;
const domainValueRegExp = /^([.]?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)([.][a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
const pathValueRegExp = /^[\u0020-\u003A\u003D-\u007E]*$/;

function decode(str) {
  return str.indexOf('%') !== -1 ? decodeURIComponent(str) : str;
}

function tryDecode(str, dec) {
  try {
    return dec(str);
  } catch (e) {
    return str;
  }
}

function isDate(val) {
  return __toString.call(val) === '[object Date]';
}

function startIndex(str, index, max) {
  do {
    const code = str.charCodeAt(index);
    if (code !== 0x20 && code !== 0x09) return index;
  } while (++index < max);
  return max;
}

function endIndex(str, index, min) {
  while (index > min) {
    const code = str.charCodeAt(--index);
    if (code !== 0x20 && code !== 0x09) return index + 1;
  }
  return min;
}

export function parse(str, opt) {
  if (typeof str !== 'string') {
    throw new TypeError('argument str must be a string');
  }

  const obj = {};
  const len = str.length;
  if (len < 2) return obj;

  const dec = (opt && opt.decode) || decode;
  let index = 0;
  let eqIdx = 0;
  let endIdx = 0;

  do {
    eqIdx = str.indexOf('=', index);
    if (eqIdx === -1) break;

    endIdx = str.indexOf(';', index);

    if (endIdx === -1) {
      endIdx = len;
    } else if (eqIdx > endIdx) {
      index = str.lastIndexOf(';', eqIdx - 1) + 1;
      continue;
    }

    const keyStartIdx = startIndex(str, index, eqIdx);
    const keyEndIdx = endIndex(str, eqIdx, keyStartIdx);
    const key = str.slice(keyStartIdx, keyEndIdx);

    if (!__hasOwnProperty.call(obj, key)) {
      let valStartIdx = startIndex(str, eqIdx + 1, endIdx);
      let valEndIdx = endIndex(str, endIdx, valStartIdx);

      if (str.charCodeAt(valStartIdx) === 0x22 && str.charCodeAt(valEndIdx - 1) === 0x22) {
        valStartIdx++;
        valEndIdx--;
      }

      const val = str.slice(valStartIdx, valEndIdx);
      obj[key] = tryDecode(val, dec);
    }

    index = endIdx + 1;
  } while (index < len);

  return obj;
}

export function serialize(name, val, opt) {
  const enc = (opt && opt.encode) || encodeURIComponent;

  if (typeof enc !== 'function') {
    throw new TypeError('option encode is invalid');
  }

  if (!cookieNameRegExp.test(name)) {
    throw new TypeError('argument name is invalid');
  }

  const value = enc(val);

  if (!cookieValueRegExp.test(value)) {
    throw new TypeError('argument val is invalid');
  }

  let str = name + '=' + value;
  if (!opt) return str;

  if (null != opt.maxAge) {
    const maxAge = Math.floor(opt.maxAge);
    if (!isFinite(maxAge)) {
      throw new TypeError('option maxAge is invalid');
    }
    str += '; Max-Age=' + maxAge;
  }

  if (opt.domain) {
    if (!domainValueRegExp.test(opt.domain)) {
      throw new TypeError('option domain is invalid');
    }
    str += '; Domain=' + opt.domain;
  }

  if (opt.path) {
    if (!pathValueRegExp.test(opt.path)) {
      throw new TypeError('option path is invalid');
    }
    str += '; Path=' + opt.path;
  }

  if (opt.expires) {
    const expires = opt.expires;
    if (!isDate(expires) || isNaN(expires.valueOf())) {
      throw new TypeError('option expires is invalid');
    }
    str += '; Expires=' + expires.toUTCString();
  }

  if (opt.httpOnly) {
    str += '; HttpOnly';
  }

  if (opt.secure) {
    str += '; Secure';
  }

  if (opt.partitioned) {
    str += '; Partitioned';
  }

  if (opt.priority) {
    const priority = typeof opt.priority === 'string' ? opt.priority.toLowerCase() : opt.priority;
    switch (priority) {
      case 'low':
        str += '; Priority=Low';
        break;
      case 'medium':
        str += '; Priority=Medium';
        break;
      case 'high':
        str += '; Priority=High';
        break;
      default:
        throw new TypeError('option priority is invalid');
    }
  }

  if (opt.sameSite) {
    const sameSite = typeof opt.sameSite === 'string' ? opt.sameSite.toLowerCase() : opt.sameSite;
    switch (sameSite) {
      case true:
        str += '; SameSite=Strict';
        break;
      case 'lax':
        str += '; SameSite=Lax';
        break;
      case 'strict':
        str += '; SameSite=Strict';
        break;
      case 'none':
        str += '; SameSite=None';
        break;
      default:
        throw new TypeError('option sameSite is invalid');
    }
  }

  return str;
}

export const parseCookie = parse;
export const stringifySetCookie = serialize;

export default {
  parse,
  serialize,
  parseCookie,
  stringifySetCookie
};
