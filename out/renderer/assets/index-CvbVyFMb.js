const isString = (obj) => typeof obj === "string";
const defer = () => {
  let res;
  let rej;
  const promise = new Promise((resolve, reject) => {
    res = resolve;
    rej = reject;
  });
  promise.resolve = res;
  promise.reject = rej;
  return promise;
};
const makeString = (object) => {
  if (object == null) return "";
  return "" + object;
};
const copy = (a, s, t2) => {
  a.forEach((m) => {
    if (s[m]) t2[m] = s[m];
  });
};
const lastOfPathSeparatorRegExp = /###/g;
const cleanKey = (key) => key && key.indexOf("###") > -1 ? key.replace(lastOfPathSeparatorRegExp, ".") : key;
const canNotTraverseDeeper = (object) => !object || isString(object);
const getLastOfPath = (object, path, Empty) => {
  const stack = !isString(path) ? path : path.split(".");
  let stackIndex = 0;
  while (stackIndex < stack.length - 1) {
    if (canNotTraverseDeeper(object)) return {};
    const key = cleanKey(stack[stackIndex]);
    if (!object[key] && Empty) object[key] = new Empty();
    if (Object.prototype.hasOwnProperty.call(object, key)) {
      object = object[key];
    } else {
      object = {};
    }
    ++stackIndex;
  }
  if (canNotTraverseDeeper(object)) return {};
  return {
    obj: object,
    k: cleanKey(stack[stackIndex])
  };
};
const setPath = (object, path, newValue) => {
  const {
    obj,
    k
  } = getLastOfPath(object, path, Object);
  if (obj !== void 0 || path.length === 1) {
    obj[k] = newValue;
    return;
  }
  let e = path[path.length - 1];
  let p = path.slice(0, path.length - 1);
  let last = getLastOfPath(object, p, Object);
  while (last.obj === void 0 && p.length) {
    e = `${p[p.length - 1]}.${e}`;
    p = p.slice(0, p.length - 1);
    last = getLastOfPath(object, p, Object);
    if (last?.obj && typeof last.obj[`${last.k}.${e}`] !== "undefined") {
      last.obj = void 0;
    }
  }
  last.obj[`${last.k}.${e}`] = newValue;
};
const pushPath = (object, path, newValue, concat) => {
  const {
    obj,
    k
  } = getLastOfPath(object, path, Object);
  obj[k] = obj[k] || [];
  obj[k].push(newValue);
};
const getPath = (object, path) => {
  const {
    obj,
    k
  } = getLastOfPath(object, path);
  if (!obj) return void 0;
  if (!Object.prototype.hasOwnProperty.call(obj, k)) return void 0;
  return obj[k];
};
const getPathWithDefaults = (data, defaultData, key) => {
  const value = getPath(data, key);
  if (value !== void 0) {
    return value;
  }
  return getPath(defaultData, key);
};
const deepExtend = (target, source, overwrite) => {
  for (const prop in source) {
    if (prop !== "__proto__" && prop !== "constructor") {
      if (prop in target) {
        if (isString(target[prop]) || target[prop] instanceof String || isString(source[prop]) || source[prop] instanceof String) {
          if (overwrite) target[prop] = source[prop];
        } else {
          deepExtend(target[prop], source[prop], overwrite);
        }
      } else {
        target[prop] = source[prop];
      }
    }
  }
  return target;
};
const regexEscape = (str) => str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
var _entityMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
  "/": "&#x2F;"
};
const escape = (data) => {
  if (isString(data)) {
    return data.replace(/[&<>"'\/]/g, (s) => _entityMap[s]);
  }
  return data;
};
class RegExpCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.regExpMap = /* @__PURE__ */ new Map();
    this.regExpQueue = [];
  }
  getRegExp(pattern) {
    const regExpFromCache = this.regExpMap.get(pattern);
    if (regExpFromCache !== void 0) {
      return regExpFromCache;
    }
    const regExpNew = new RegExp(pattern);
    if (this.regExpQueue.length === this.capacity) {
      this.regExpMap.delete(this.regExpQueue.shift());
    }
    this.regExpMap.set(pattern, regExpNew);
    this.regExpQueue.push(pattern);
    return regExpNew;
  }
}
const chars = [" ", ",", "?", "!", ";"];
const looksLikeObjectPathRegExpCache = new RegExpCache(20);
const looksLikeObjectPath = (key, nsSeparator, keySeparator) => {
  nsSeparator = nsSeparator || "";
  keySeparator = keySeparator || "";
  const possibleChars = chars.filter((c) => nsSeparator.indexOf(c) < 0 && keySeparator.indexOf(c) < 0);
  if (possibleChars.length === 0) return true;
  const r = looksLikeObjectPathRegExpCache.getRegExp(`(${possibleChars.map((c) => c === "?" ? "\\?" : c).join("|")})`);
  let matched = !r.test(key);
  if (!matched) {
    const ki = key.indexOf(keySeparator);
    if (ki > 0 && !r.test(key.substring(0, ki))) {
      matched = true;
    }
  }
  return matched;
};
const deepFind = (obj, path, keySeparator = ".") => {
  if (!obj) return void 0;
  if (obj[path]) {
    if (!Object.prototype.hasOwnProperty.call(obj, path)) return void 0;
    return obj[path];
  }
  const tokens = path.split(keySeparator);
  let current = obj;
  for (let i = 0; i < tokens.length; ) {
    if (!current || typeof current !== "object") {
      return void 0;
    }
    let next;
    let nextPath = "";
    for (let j = i; j < tokens.length; ++j) {
      if (j !== i) {
        nextPath += keySeparator;
      }
      nextPath += tokens[j];
      next = current[nextPath];
      if (next !== void 0) {
        if (["string", "number", "boolean"].indexOf(typeof next) > -1 && j < tokens.length - 1) {
          continue;
        }
        i += j - i + 1;
        break;
      }
    }
    current = next;
  }
  return current;
};
const getCleanedCode = (code) => code?.replace("_", "-");
const consoleLogger = {
  type: "logger",
  log(args) {
    this.output("log", args);
  },
  warn(args) {
    this.output("warn", args);
  },
  error(args) {
    this.output("error", args);
  },
  output(type, args) {
    console?.[type]?.apply?.(console, args);
  }
};
class Logger {
  constructor(concreteLogger, options2 = {}) {
    this.init(concreteLogger, options2);
  }
  init(concreteLogger, options2 = {}) {
    this.prefix = options2.prefix || "i18next:";
    this.logger = concreteLogger || consoleLogger;
    this.options = options2;
    this.debug = options2.debug;
  }
  log(...args) {
    return this.forward(args, "log", "", true);
  }
  warn(...args) {
    return this.forward(args, "warn", "", true);
  }
  error(...args) {
    return this.forward(args, "error", "");
  }
  deprecate(...args) {
    return this.forward(args, "warn", "WARNING DEPRECATED: ", true);
  }
  forward(args, lvl, prefix, debugOnly) {
    if (debugOnly && !this.debug) return null;
    if (isString(args[0])) args[0] = `${prefix}${this.prefix} ${args[0]}`;
    return this.logger[lvl](args);
  }
  create(moduleName) {
    return new Logger(this.logger, {
      ...{
        prefix: `${this.prefix}:${moduleName}:`
      },
      ...this.options
    });
  }
  clone(options2) {
    options2 = options2 || this.options;
    options2.prefix = options2.prefix || this.prefix;
    return new Logger(this.logger, options2);
  }
}
var baseLogger = new Logger();
class EventEmitter {
  constructor() {
    this.observers = {};
  }
  on(events, listener) {
    events.split(" ").forEach((event) => {
      if (!this.observers[event]) this.observers[event] = /* @__PURE__ */ new Map();
      const numListeners = this.observers[event].get(listener) || 0;
      this.observers[event].set(listener, numListeners + 1);
    });
    return this;
  }
  off(event, listener) {
    if (!this.observers[event]) return;
    if (!listener) {
      delete this.observers[event];
      return;
    }
    this.observers[event].delete(listener);
  }
  emit(event, ...args) {
    if (this.observers[event]) {
      const cloned = Array.from(this.observers[event].entries());
      cloned.forEach(([observer, numTimesAdded]) => {
        for (let i = 0; i < numTimesAdded; i++) {
          observer(...args);
        }
      });
    }
    if (this.observers["*"]) {
      const cloned = Array.from(this.observers["*"].entries());
      cloned.forEach(([observer, numTimesAdded]) => {
        for (let i = 0; i < numTimesAdded; i++) {
          observer.apply(observer, [event, ...args]);
        }
      });
    }
  }
}
class ResourceStore extends EventEmitter {
  constructor(data, options2 = {
    ns: ["translation"],
    defaultNS: "translation"
  }) {
    super();
    this.data = data || {};
    this.options = options2;
    if (this.options.keySeparator === void 0) {
      this.options.keySeparator = ".";
    }
    if (this.options.ignoreJSONStructure === void 0) {
      this.options.ignoreJSONStructure = true;
    }
  }
  addNamespaces(ns) {
    if (this.options.ns.indexOf(ns) < 0) {
      this.options.ns.push(ns);
    }
  }
  removeNamespaces(ns) {
    const index = this.options.ns.indexOf(ns);
    if (index > -1) {
      this.options.ns.splice(index, 1);
    }
  }
  getResource(lng, ns, key, options2 = {}) {
    const keySeparator = options2.keySeparator !== void 0 ? options2.keySeparator : this.options.keySeparator;
    const ignoreJSONStructure = options2.ignoreJSONStructure !== void 0 ? options2.ignoreJSONStructure : this.options.ignoreJSONStructure;
    let path;
    if (lng.indexOf(".") > -1) {
      path = lng.split(".");
    } else {
      path = [lng, ns];
      if (key) {
        if (Array.isArray(key)) {
          path.push(...key);
        } else if (isString(key) && keySeparator) {
          path.push(...key.split(keySeparator));
        } else {
          path.push(key);
        }
      }
    }
    const result = getPath(this.data, path);
    if (!result && !ns && !key && lng.indexOf(".") > -1) {
      lng = path[0];
      ns = path[1];
      key = path.slice(2).join(".");
    }
    if (result || !ignoreJSONStructure || !isString(key)) return result;
    return deepFind(this.data?.[lng]?.[ns], key, keySeparator);
  }
  addResource(lng, ns, key, value, options2 = {
    silent: false
  }) {
    const keySeparator = options2.keySeparator !== void 0 ? options2.keySeparator : this.options.keySeparator;
    let path = [lng, ns];
    if (key) path = path.concat(keySeparator ? key.split(keySeparator) : key);
    if (lng.indexOf(".") > -1) {
      path = lng.split(".");
      value = ns;
      ns = path[1];
    }
    this.addNamespaces(ns);
    setPath(this.data, path, value);
    if (!options2.silent) this.emit("added", lng, ns, key, value);
  }
  addResources(lng, ns, resources, options2 = {
    silent: false
  }) {
    for (const m in resources) {
      if (isString(resources[m]) || Array.isArray(resources[m])) this.addResource(lng, ns, m, resources[m], {
        silent: true
      });
    }
    if (!options2.silent) this.emit("added", lng, ns, resources);
  }
  addResourceBundle(lng, ns, resources, deep, overwrite, options2 = {
    silent: false,
    skipCopy: false
  }) {
    let path = [lng, ns];
    if (lng.indexOf(".") > -1) {
      path = lng.split(".");
      deep = resources;
      resources = ns;
      ns = path[1];
    }
    this.addNamespaces(ns);
    let pack = getPath(this.data, path) || {};
    if (!options2.skipCopy) resources = JSON.parse(JSON.stringify(resources));
    if (deep) {
      deepExtend(pack, resources, overwrite);
    } else {
      pack = {
        ...pack,
        ...resources
      };
    }
    setPath(this.data, path, pack);
    if (!options2.silent) this.emit("added", lng, ns, resources);
  }
  removeResourceBundle(lng, ns) {
    if (this.hasResourceBundle(lng, ns)) {
      delete this.data[lng][ns];
    }
    this.removeNamespaces(ns);
    this.emit("removed", lng, ns);
  }
  hasResourceBundle(lng, ns) {
    return this.getResource(lng, ns) !== void 0;
  }
  getResourceBundle(lng, ns) {
    if (!ns) ns = this.options.defaultNS;
    return this.getResource(lng, ns);
  }
  getDataByLanguage(lng) {
    return this.data[lng];
  }
  hasLanguageSomeTranslations(lng) {
    const data = this.getDataByLanguage(lng);
    const n = data && Object.keys(data) || [];
    return !!n.find((v) => data[v] && Object.keys(data[v]).length > 0);
  }
  toJSON() {
    return this.data;
  }
}
var postProcessor = {
  processors: {},
  addPostProcessor(module) {
    this.processors[module.name] = module;
  },
  handle(processors, value, key, options2, translator) {
    processors.forEach((processor) => {
      value = this.processors[processor]?.process(value, key, options2, translator) ?? value;
    });
    return value;
  }
};
const PATH_KEY = Symbol("i18next/PATH_KEY");
function createProxy() {
  const state = [];
  const handler = /* @__PURE__ */ Object.create(null);
  let proxy;
  handler.get = (target, key) => {
    proxy?.revoke?.();
    if (key === PATH_KEY) return state;
    state.push(key);
    proxy = Proxy.revocable(target, handler);
    return proxy.proxy;
  };
  return Proxy.revocable(/* @__PURE__ */ Object.create(null), handler).proxy;
}
function keysFromSelector(selector, opts) {
  const {
    [PATH_KEY]: path
  } = selector(createProxy());
  return path.join(opts?.keySeparator ?? ".");
}
const checkedLoadedFor = {};
const shouldHandleAsObject = (res) => !isString(res) && typeof res !== "boolean" && typeof res !== "number";
class Translator extends EventEmitter {
  constructor(services, options2 = {}) {
    super();
    copy(["resourceStore", "languageUtils", "pluralResolver", "interpolator", "backendConnector", "i18nFormat", "utils"], services, this);
    this.options = options2;
    if (this.options.keySeparator === void 0) {
      this.options.keySeparator = ".";
    }
    this.logger = baseLogger.create("translator");
  }
  changeLanguage(lng) {
    if (lng) this.language = lng;
  }
  exists(key, o = {
    interpolation: {}
  }) {
    const opt = {
      ...o
    };
    if (key == null) return false;
    const resolved = this.resolve(key, opt);
    if (resolved?.res === void 0) return false;
    const isObject = shouldHandleAsObject(resolved.res);
    if (opt.returnObjects === false && isObject) {
      return false;
    }
    return true;
  }
  extractFromKey(key, opt) {
    let nsSeparator = opt.nsSeparator !== void 0 ? opt.nsSeparator : this.options.nsSeparator;
    if (nsSeparator === void 0) nsSeparator = ":";
    const keySeparator = opt.keySeparator !== void 0 ? opt.keySeparator : this.options.keySeparator;
    let namespaces = opt.ns || this.options.defaultNS || [];
    const wouldCheckForNsInKey = nsSeparator && key.indexOf(nsSeparator) > -1;
    const seemsNaturalLanguage = !this.options.userDefinedKeySeparator && !opt.keySeparator && !this.options.userDefinedNsSeparator && !opt.nsSeparator && !looksLikeObjectPath(key, nsSeparator, keySeparator);
    if (wouldCheckForNsInKey && !seemsNaturalLanguage) {
      const m = key.match(this.interpolator.nestingRegexp);
      if (m && m.length > 0) {
        return {
          key,
          namespaces: isString(namespaces) ? [namespaces] : namespaces
        };
      }
      const parts = key.split(nsSeparator);
      if (nsSeparator !== keySeparator || nsSeparator === keySeparator && this.options.ns.indexOf(parts[0]) > -1) namespaces = parts.shift();
      key = parts.join(keySeparator);
    }
    return {
      key,
      namespaces: isString(namespaces) ? [namespaces] : namespaces
    };
  }
  translate(keys, o, lastKey) {
    let opt = typeof o === "object" ? {
      ...o
    } : o;
    if (typeof opt !== "object" && this.options.overloadTranslationOptionHandler) {
      opt = this.options.overloadTranslationOptionHandler(arguments);
    }
    if (typeof opt === "object") opt = {
      ...opt
    };
    if (!opt) opt = {};
    if (keys == null) return "";
    if (typeof keys === "function") keys = keysFromSelector(keys, {
      ...this.options,
      ...opt
    });
    if (!Array.isArray(keys)) keys = [String(keys)];
    const returnDetails = opt.returnDetails !== void 0 ? opt.returnDetails : this.options.returnDetails;
    const keySeparator = opt.keySeparator !== void 0 ? opt.keySeparator : this.options.keySeparator;
    const {
      key,
      namespaces
    } = this.extractFromKey(keys[keys.length - 1], opt);
    const namespace = namespaces[namespaces.length - 1];
    let nsSeparator = opt.nsSeparator !== void 0 ? opt.nsSeparator : this.options.nsSeparator;
    if (nsSeparator === void 0) nsSeparator = ":";
    const lng = opt.lng || this.language;
    const appendNamespaceToCIMode = opt.appendNamespaceToCIMode || this.options.appendNamespaceToCIMode;
    if (lng?.toLowerCase() === "cimode") {
      if (appendNamespaceToCIMode) {
        if (returnDetails) {
          return {
            res: `${namespace}${nsSeparator}${key}`,
            usedKey: key,
            exactUsedKey: key,
            usedLng: lng,
            usedNS: namespace,
            usedParams: this.getUsedParamsDetails(opt)
          };
        }
        return `${namespace}${nsSeparator}${key}`;
      }
      if (returnDetails) {
        return {
          res: key,
          usedKey: key,
          exactUsedKey: key,
          usedLng: lng,
          usedNS: namespace,
          usedParams: this.getUsedParamsDetails(opt)
        };
      }
      return key;
    }
    const resolved = this.resolve(keys, opt);
    let res = resolved?.res;
    const resUsedKey = resolved?.usedKey || key;
    const resExactUsedKey = resolved?.exactUsedKey || key;
    const noObject = ["[object Number]", "[object Function]", "[object RegExp]"];
    const joinArrays = opt.joinArrays !== void 0 ? opt.joinArrays : this.options.joinArrays;
    const handleAsObjectInI18nFormat = !this.i18nFormat || this.i18nFormat.handleAsObject;
    const needsPluralHandling = opt.count !== void 0 && !isString(opt.count);
    const hasDefaultValue = Translator.hasDefaultValue(opt);
    const defaultValueSuffix = needsPluralHandling ? this.pluralResolver.getSuffix(lng, opt.count, opt) : "";
    const defaultValueSuffixOrdinalFallback = opt.ordinal && needsPluralHandling ? this.pluralResolver.getSuffix(lng, opt.count, {
      ordinal: false
    }) : "";
    const needsZeroSuffixLookup = needsPluralHandling && !opt.ordinal && opt.count === 0;
    const defaultValue = needsZeroSuffixLookup && opt[`defaultValue${this.options.pluralSeparator}zero`] || opt[`defaultValue${defaultValueSuffix}`] || opt[`defaultValue${defaultValueSuffixOrdinalFallback}`] || opt.defaultValue;
    let resForObjHndl = res;
    if (handleAsObjectInI18nFormat && !res && hasDefaultValue) {
      resForObjHndl = defaultValue;
    }
    const handleAsObject = shouldHandleAsObject(resForObjHndl);
    const resType = Object.prototype.toString.apply(resForObjHndl);
    if (handleAsObjectInI18nFormat && resForObjHndl && handleAsObject && noObject.indexOf(resType) < 0 && !(isString(joinArrays) && Array.isArray(resForObjHndl))) {
      if (!opt.returnObjects && !this.options.returnObjects) {
        if (!this.options.returnedObjectHandler) {
          this.logger.warn("accessing an object - but returnObjects options is not enabled!");
        }
        const r = this.options.returnedObjectHandler ? this.options.returnedObjectHandler(resUsedKey, resForObjHndl, {
          ...opt,
          ns: namespaces
        }) : `key '${key} (${this.language})' returned an object instead of string.`;
        if (returnDetails) {
          resolved.res = r;
          resolved.usedParams = this.getUsedParamsDetails(opt);
          return resolved;
        }
        return r;
      }
      if (keySeparator) {
        const resTypeIsArray = Array.isArray(resForObjHndl);
        const copy2 = resTypeIsArray ? [] : {};
        const newKeyToUse = resTypeIsArray ? resExactUsedKey : resUsedKey;
        for (const m in resForObjHndl) {
          if (Object.prototype.hasOwnProperty.call(resForObjHndl, m)) {
            const deepKey = `${newKeyToUse}${keySeparator}${m}`;
            if (hasDefaultValue && !res) {
              copy2[m] = this.translate(deepKey, {
                ...opt,
                defaultValue: shouldHandleAsObject(defaultValue) ? defaultValue[m] : void 0,
                ...{
                  joinArrays: false,
                  ns: namespaces
                }
              });
            } else {
              copy2[m] = this.translate(deepKey, {
                ...opt,
                ...{
                  joinArrays: false,
                  ns: namespaces
                }
              });
            }
            if (copy2[m] === deepKey) copy2[m] = resForObjHndl[m];
          }
        }
        res = copy2;
      }
    } else if (handleAsObjectInI18nFormat && isString(joinArrays) && Array.isArray(res)) {
      res = res.join(joinArrays);
      if (res) res = this.extendTranslation(res, keys, opt, lastKey);
    } else {
      let usedDefault = false;
      let usedKey = false;
      if (!this.isValidLookup(res) && hasDefaultValue) {
        usedDefault = true;
        res = defaultValue;
      }
      if (!this.isValidLookup(res)) {
        usedKey = true;
        res = key;
      }
      const missingKeyNoValueFallbackToKey = opt.missingKeyNoValueFallbackToKey || this.options.missingKeyNoValueFallbackToKey;
      const resForMissing = missingKeyNoValueFallbackToKey && usedKey ? void 0 : res;
      const updateMissing = hasDefaultValue && defaultValue !== res && this.options.updateMissing;
      if (usedKey || usedDefault || updateMissing) {
        this.logger.log(updateMissing ? "updateKey" : "missingKey", lng, namespace, key, updateMissing ? defaultValue : res);
        if (keySeparator) {
          const fk = this.resolve(key, {
            ...opt,
            keySeparator: false
          });
          if (fk && fk.res) this.logger.warn("Seems the loaded translations were in flat JSON format instead of nested. Either set keySeparator: false on init or make sure your translations are published in nested format.");
        }
        let lngs = [];
        const fallbackLngs = this.languageUtils.getFallbackCodes(this.options.fallbackLng, opt.lng || this.language);
        if (this.options.saveMissingTo === "fallback" && fallbackLngs && fallbackLngs[0]) {
          for (let i = 0; i < fallbackLngs.length; i++) {
            lngs.push(fallbackLngs[i]);
          }
        } else if (this.options.saveMissingTo === "all") {
          lngs = this.languageUtils.toResolveHierarchy(opt.lng || this.language);
        } else {
          lngs.push(opt.lng || this.language);
        }
        const send = (l, k, specificDefaultValue) => {
          const defaultForMissing = hasDefaultValue && specificDefaultValue !== res ? specificDefaultValue : resForMissing;
          if (this.options.missingKeyHandler) {
            this.options.missingKeyHandler(l, namespace, k, defaultForMissing, updateMissing, opt);
          } else if (this.backendConnector?.saveMissing) {
            this.backendConnector.saveMissing(l, namespace, k, defaultForMissing, updateMissing, opt);
          }
          this.emit("missingKey", l, namespace, k, res);
        };
        if (this.options.saveMissing) {
          if (this.options.saveMissingPlurals && needsPluralHandling) {
            lngs.forEach((language) => {
              const suffixes = this.pluralResolver.getSuffixes(language, opt);
              if (needsZeroSuffixLookup && opt[`defaultValue${this.options.pluralSeparator}zero`] && suffixes.indexOf(`${this.options.pluralSeparator}zero`) < 0) {
                suffixes.push(`${this.options.pluralSeparator}zero`);
              }
              suffixes.forEach((suffix) => {
                send([language], key + suffix, opt[`defaultValue${suffix}`] || defaultValue);
              });
            });
          } else {
            send(lngs, key, defaultValue);
          }
        }
      }
      res = this.extendTranslation(res, keys, opt, resolved, lastKey);
      if (usedKey && res === key && this.options.appendNamespaceToMissingKey) {
        res = `${namespace}${nsSeparator}${key}`;
      }
      if ((usedKey || usedDefault) && this.options.parseMissingKeyHandler) {
        res = this.options.parseMissingKeyHandler(this.options.appendNamespaceToMissingKey ? `${namespace}${nsSeparator}${key}` : key, usedDefault ? res : void 0, opt);
      }
    }
    if (returnDetails) {
      resolved.res = res;
      resolved.usedParams = this.getUsedParamsDetails(opt);
      return resolved;
    }
    return res;
  }
  extendTranslation(res, key, opt, resolved, lastKey) {
    if (this.i18nFormat?.parse) {
      res = this.i18nFormat.parse(res, {
        ...this.options.interpolation.defaultVariables,
        ...opt
      }, opt.lng || this.language || resolved.usedLng, resolved.usedNS, resolved.usedKey, {
        resolved
      });
    } else if (!opt.skipInterpolation) {
      if (opt.interpolation) this.interpolator.init({
        ...opt,
        ...{
          interpolation: {
            ...this.options.interpolation,
            ...opt.interpolation
          }
        }
      });
      const skipOnVariables = isString(res) && (opt?.interpolation?.skipOnVariables !== void 0 ? opt.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables);
      let nestBef;
      if (skipOnVariables) {
        const nb = res.match(this.interpolator.nestingRegexp);
        nestBef = nb && nb.length;
      }
      let data = opt.replace && !isString(opt.replace) ? opt.replace : opt;
      if (this.options.interpolation.defaultVariables) data = {
        ...this.options.interpolation.defaultVariables,
        ...data
      };
      res = this.interpolator.interpolate(res, data, opt.lng || this.language || resolved.usedLng, opt);
      if (skipOnVariables) {
        const na = res.match(this.interpolator.nestingRegexp);
        const nestAft = na && na.length;
        if (nestBef < nestAft) opt.nest = false;
      }
      if (!opt.lng && resolved && resolved.res) opt.lng = this.language || resolved.usedLng;
      if (opt.nest !== false) res = this.interpolator.nest(res, (...args) => {
        if (lastKey?.[0] === args[0] && !opt.context) {
          this.logger.warn(`It seems you are nesting recursively key: ${args[0]} in key: ${key[0]}`);
          return null;
        }
        return this.translate(...args, key);
      }, opt);
      if (opt.interpolation) this.interpolator.reset();
    }
    const postProcess = opt.postProcess || this.options.postProcess;
    const postProcessorNames = isString(postProcess) ? [postProcess] : postProcess;
    if (res != null && postProcessorNames?.length && opt.applyPostProcessor !== false) {
      res = postProcessor.handle(postProcessorNames, res, key, this.options && this.options.postProcessPassResolved ? {
        i18nResolved: {
          ...resolved,
          usedParams: this.getUsedParamsDetails(opt)
        },
        ...opt
      } : opt, this);
    }
    return res;
  }
  resolve(keys, opt = {}) {
    let found;
    let usedKey;
    let exactUsedKey;
    let usedLng;
    let usedNS;
    if (isString(keys)) keys = [keys];
    keys.forEach((k) => {
      if (this.isValidLookup(found)) return;
      const extracted = this.extractFromKey(k, opt);
      const key = extracted.key;
      usedKey = key;
      let namespaces = extracted.namespaces;
      if (this.options.fallbackNS) namespaces = namespaces.concat(this.options.fallbackNS);
      const needsPluralHandling = opt.count !== void 0 && !isString(opt.count);
      const needsZeroSuffixLookup = needsPluralHandling && !opt.ordinal && opt.count === 0;
      const needsContextHandling = opt.context !== void 0 && (isString(opt.context) || typeof opt.context === "number") && opt.context !== "";
      const codes = opt.lngs ? opt.lngs : this.languageUtils.toResolveHierarchy(opt.lng || this.language, opt.fallbackLng);
      namespaces.forEach((ns) => {
        if (this.isValidLookup(found)) return;
        usedNS = ns;
        if (!checkedLoadedFor[`${codes[0]}-${ns}`] && this.utils?.hasLoadedNamespace && !this.utils?.hasLoadedNamespace(usedNS)) {
          checkedLoadedFor[`${codes[0]}-${ns}`] = true;
          this.logger.warn(`key "${usedKey}" for languages "${codes.join(", ")}" won't get resolved as namespace "${usedNS}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!");
        }
        codes.forEach((code) => {
          if (this.isValidLookup(found)) return;
          usedLng = code;
          const finalKeys = [key];
          if (this.i18nFormat?.addLookupKeys) {
            this.i18nFormat.addLookupKeys(finalKeys, key, code, ns, opt);
          } else {
            let pluralSuffix;
            if (needsPluralHandling) pluralSuffix = this.pluralResolver.getSuffix(code, opt.count, opt);
            const zeroSuffix = `${this.options.pluralSeparator}zero`;
            const ordinalPrefix = `${this.options.pluralSeparator}ordinal${this.options.pluralSeparator}`;
            if (needsPluralHandling) {
              if (opt.ordinal && pluralSuffix.indexOf(ordinalPrefix) === 0) {
                finalKeys.push(key + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator));
              }
              finalKeys.push(key + pluralSuffix);
              if (needsZeroSuffixLookup) {
                finalKeys.push(key + zeroSuffix);
              }
            }
            if (needsContextHandling) {
              const contextKey = `${key}${this.options.contextSeparator || "_"}${opt.context}`;
              finalKeys.push(contextKey);
              if (needsPluralHandling) {
                if (opt.ordinal && pluralSuffix.indexOf(ordinalPrefix) === 0) {
                  finalKeys.push(contextKey + pluralSuffix.replace(ordinalPrefix, this.options.pluralSeparator));
                }
                finalKeys.push(contextKey + pluralSuffix);
                if (needsZeroSuffixLookup) {
                  finalKeys.push(contextKey + zeroSuffix);
                }
              }
            }
          }
          let possibleKey;
          while (possibleKey = finalKeys.pop()) {
            if (!this.isValidLookup(found)) {
              exactUsedKey = possibleKey;
              found = this.getResource(code, ns, possibleKey, opt);
            }
          }
        });
      });
    });
    return {
      res: found,
      usedKey,
      exactUsedKey,
      usedLng,
      usedNS
    };
  }
  isValidLookup(res) {
    return res !== void 0 && !(!this.options.returnNull && res === null) && !(!this.options.returnEmptyString && res === "");
  }
  getResource(code, ns, key, options2 = {}) {
    if (this.i18nFormat?.getResource) return this.i18nFormat.getResource(code, ns, key, options2);
    return this.resourceStore.getResource(code, ns, key, options2);
  }
  getUsedParamsDetails(options2 = {}) {
    const optionsKeys = ["defaultValue", "ordinal", "context", "replace", "lng", "lngs", "fallbackLng", "ns", "keySeparator", "nsSeparator", "returnObjects", "returnDetails", "joinArrays", "postProcess", "interpolation"];
    const useOptionsReplaceForData = options2.replace && !isString(options2.replace);
    let data = useOptionsReplaceForData ? options2.replace : options2;
    if (useOptionsReplaceForData && typeof options2.count !== "undefined") {
      data.count = options2.count;
    }
    if (this.options.interpolation.defaultVariables) {
      data = {
        ...this.options.interpolation.defaultVariables,
        ...data
      };
    }
    if (!useOptionsReplaceForData) {
      data = {
        ...data
      };
      for (const key of optionsKeys) {
        delete data[key];
      }
    }
    return data;
  }
  static hasDefaultValue(options2) {
    const prefix = "defaultValue";
    for (const option in options2) {
      if (Object.prototype.hasOwnProperty.call(options2, option) && prefix === option.substring(0, prefix.length) && void 0 !== options2[option]) {
        return true;
      }
    }
    return false;
  }
}
class LanguageUtil {
  constructor(options2) {
    this.options = options2;
    this.supportedLngs = this.options.supportedLngs || false;
    this.logger = baseLogger.create("languageUtils");
  }
  getScriptPartFromCode(code) {
    code = getCleanedCode(code);
    if (!code || code.indexOf("-") < 0) return null;
    const p = code.split("-");
    if (p.length === 2) return null;
    p.pop();
    if (p[p.length - 1].toLowerCase() === "x") return null;
    return this.formatLanguageCode(p.join("-"));
  }
  getLanguagePartFromCode(code) {
    code = getCleanedCode(code);
    if (!code || code.indexOf("-") < 0) return code;
    const p = code.split("-");
    return this.formatLanguageCode(p[0]);
  }
  formatLanguageCode(code) {
    if (isString(code) && code.indexOf("-") > -1) {
      let formattedCode;
      try {
        formattedCode = Intl.getCanonicalLocales(code)[0];
      } catch (e) {
      }
      if (formattedCode && this.options.lowerCaseLng) {
        formattedCode = formattedCode.toLowerCase();
      }
      if (formattedCode) return formattedCode;
      if (this.options.lowerCaseLng) {
        return code.toLowerCase();
      }
      return code;
    }
    return this.options.cleanCode || this.options.lowerCaseLng ? code.toLowerCase() : code;
  }
  isSupportedCode(code) {
    if (this.options.load === "languageOnly" || this.options.nonExplicitSupportedLngs) {
      code = this.getLanguagePartFromCode(code);
    }
    return !this.supportedLngs || !this.supportedLngs.length || this.supportedLngs.indexOf(code) > -1;
  }
  getBestMatchFromCodes(codes) {
    if (!codes) return null;
    let found;
    codes.forEach((code) => {
      if (found) return;
      const cleanedLng = this.formatLanguageCode(code);
      if (!this.options.supportedLngs || this.isSupportedCode(cleanedLng)) found = cleanedLng;
    });
    if (!found && this.options.supportedLngs) {
      codes.forEach((code) => {
        if (found) return;
        const lngScOnly = this.getScriptPartFromCode(code);
        if (this.isSupportedCode(lngScOnly)) return found = lngScOnly;
        const lngOnly = this.getLanguagePartFromCode(code);
        if (this.isSupportedCode(lngOnly)) return found = lngOnly;
        found = this.options.supportedLngs.find((supportedLng) => {
          if (supportedLng === lngOnly) return supportedLng;
          if (supportedLng.indexOf("-") < 0 && lngOnly.indexOf("-") < 0) return;
          if (supportedLng.indexOf("-") > 0 && lngOnly.indexOf("-") < 0 && supportedLng.substring(0, supportedLng.indexOf("-")) === lngOnly) return supportedLng;
          if (supportedLng.indexOf(lngOnly) === 0 && lngOnly.length > 1) return supportedLng;
        });
      });
    }
    if (!found) found = this.getFallbackCodes(this.options.fallbackLng)[0];
    return found;
  }
  getFallbackCodes(fallbacks, code) {
    if (!fallbacks) return [];
    if (typeof fallbacks === "function") fallbacks = fallbacks(code);
    if (isString(fallbacks)) fallbacks = [fallbacks];
    if (Array.isArray(fallbacks)) return fallbacks;
    if (!code) return fallbacks.default || [];
    let found = fallbacks[code];
    if (!found) found = fallbacks[this.getScriptPartFromCode(code)];
    if (!found) found = fallbacks[this.formatLanguageCode(code)];
    if (!found) found = fallbacks[this.getLanguagePartFromCode(code)];
    if (!found) found = fallbacks.default;
    return found || [];
  }
  toResolveHierarchy(code, fallbackCode) {
    const fallbackCodes = this.getFallbackCodes((fallbackCode === false ? [] : fallbackCode) || this.options.fallbackLng || [], code);
    const codes = [];
    const addCode = (c) => {
      if (!c) return;
      if (this.isSupportedCode(c)) {
        codes.push(c);
      } else {
        this.logger.warn(`rejecting language code not found in supportedLngs: ${c}`);
      }
    };
    if (isString(code) && (code.indexOf("-") > -1 || code.indexOf("_") > -1)) {
      if (this.options.load !== "languageOnly") addCode(this.formatLanguageCode(code));
      if (this.options.load !== "languageOnly" && this.options.load !== "currentOnly") addCode(this.getScriptPartFromCode(code));
      if (this.options.load !== "currentOnly") addCode(this.getLanguagePartFromCode(code));
    } else if (isString(code)) {
      addCode(this.formatLanguageCode(code));
    }
    fallbackCodes.forEach((fc) => {
      if (codes.indexOf(fc) < 0) addCode(this.formatLanguageCode(fc));
    });
    return codes;
  }
}
const suffixesOrder = {
  zero: 0,
  one: 1,
  two: 2,
  few: 3,
  many: 4,
  other: 5
};
const dummyRule = {
  select: (count) => count === 1 ? "one" : "other",
  resolvedOptions: () => ({
    pluralCategories: ["one", "other"]
  })
};
class PluralResolver {
  constructor(languageUtils, options2 = {}) {
    this.languageUtils = languageUtils;
    this.options = options2;
    this.logger = baseLogger.create("pluralResolver");
    this.pluralRulesCache = {};
  }
  clearCache() {
    this.pluralRulesCache = {};
  }
  getRule(code, options2 = {}) {
    const cleanedCode = getCleanedCode(code === "dev" ? "en" : code);
    const type = options2.ordinal ? "ordinal" : "cardinal";
    const cacheKey = JSON.stringify({
      cleanedCode,
      type
    });
    if (cacheKey in this.pluralRulesCache) {
      return this.pluralRulesCache[cacheKey];
    }
    let rule;
    try {
      rule = new Intl.PluralRules(cleanedCode, {
        type
      });
    } catch (err) {
      if (typeof Intl === "undefined") {
        this.logger.error("No Intl support, please use an Intl polyfill!");
        return dummyRule;
      }
      if (!code.match(/-|_/)) return dummyRule;
      const lngPart = this.languageUtils.getLanguagePartFromCode(code);
      rule = this.getRule(lngPart, options2);
    }
    this.pluralRulesCache[cacheKey] = rule;
    return rule;
  }
  needsPlural(code, options2 = {}) {
    let rule = this.getRule(code, options2);
    if (!rule) rule = this.getRule("dev", options2);
    return rule?.resolvedOptions().pluralCategories.length > 1;
  }
  getPluralFormsOfKey(code, key, options2 = {}) {
    return this.getSuffixes(code, options2).map((suffix) => `${key}${suffix}`);
  }
  getSuffixes(code, options2 = {}) {
    let rule = this.getRule(code, options2);
    if (!rule) rule = this.getRule("dev", options2);
    if (!rule) return [];
    return rule.resolvedOptions().pluralCategories.sort((pluralCategory1, pluralCategory2) => suffixesOrder[pluralCategory1] - suffixesOrder[pluralCategory2]).map((pluralCategory) => `${this.options.prepend}${options2.ordinal ? `ordinal${this.options.prepend}` : ""}${pluralCategory}`);
  }
  getSuffix(code, count, options2 = {}) {
    const rule = this.getRule(code, options2);
    if (rule) {
      return `${this.options.prepend}${options2.ordinal ? `ordinal${this.options.prepend}` : ""}${rule.select(count)}`;
    }
    this.logger.warn(`no plural rule found for: ${code}`);
    return this.getSuffix("dev", count, options2);
  }
}
const deepFindWithDefaults = (data, defaultData, key, keySeparator = ".", ignoreJSONStructure = true) => {
  let path = getPathWithDefaults(data, defaultData, key);
  if (!path && ignoreJSONStructure && isString(key)) {
    path = deepFind(data, key, keySeparator);
    if (path === void 0) path = deepFind(defaultData, key, keySeparator);
  }
  return path;
};
const regexSafe = (val) => val.replace(/\$/g, "$$$$");
class Interpolator {
  constructor(options2 = {}) {
    this.logger = baseLogger.create("interpolator");
    this.options = options2;
    this.format = options2?.interpolation?.format || ((value) => value);
    this.init(options2);
  }
  init(options2 = {}) {
    if (!options2.interpolation) options2.interpolation = {
      escapeValue: true
    };
    const {
      escape: escape$1,
      escapeValue,
      useRawValueToEscape,
      prefix,
      prefixEscaped,
      suffix,
      suffixEscaped,
      formatSeparator,
      unescapeSuffix,
      unescapePrefix,
      nestingPrefix,
      nestingPrefixEscaped,
      nestingSuffix,
      nestingSuffixEscaped,
      nestingOptionsSeparator,
      maxReplaces,
      alwaysFormat
    } = options2.interpolation;
    this.escape = escape$1 !== void 0 ? escape$1 : escape;
    this.escapeValue = escapeValue !== void 0 ? escapeValue : true;
    this.useRawValueToEscape = useRawValueToEscape !== void 0 ? useRawValueToEscape : false;
    this.prefix = prefix ? regexEscape(prefix) : prefixEscaped || "{{";
    this.suffix = suffix ? regexEscape(suffix) : suffixEscaped || "}}";
    this.formatSeparator = formatSeparator || ",";
    this.unescapePrefix = unescapeSuffix ? "" : unescapePrefix || "-";
    this.unescapeSuffix = this.unescapePrefix ? "" : unescapeSuffix || "";
    this.nestingPrefix = nestingPrefix ? regexEscape(nestingPrefix) : nestingPrefixEscaped || regexEscape("$t(");
    this.nestingSuffix = nestingSuffix ? regexEscape(nestingSuffix) : nestingSuffixEscaped || regexEscape(")");
    this.nestingOptionsSeparator = nestingOptionsSeparator || ",";
    this.maxReplaces = maxReplaces || 1e3;
    this.alwaysFormat = alwaysFormat !== void 0 ? alwaysFormat : false;
    this.resetRegExp();
  }
  reset() {
    if (this.options) this.init(this.options);
  }
  resetRegExp() {
    const getOrResetRegExp = (existingRegExp, pattern) => {
      if (existingRegExp?.source === pattern) {
        existingRegExp.lastIndex = 0;
        return existingRegExp;
      }
      return new RegExp(pattern, "g");
    };
    this.regexp = getOrResetRegExp(this.regexp, `${this.prefix}(.+?)${this.suffix}`);
    this.regexpUnescape = getOrResetRegExp(this.regexpUnescape, `${this.prefix}${this.unescapePrefix}(.+?)${this.unescapeSuffix}${this.suffix}`);
    this.nestingRegexp = getOrResetRegExp(this.nestingRegexp, `${this.nestingPrefix}((?:[^()"']+|"[^"]*"|'[^']*'|\\((?:[^()]|"[^"]*"|'[^']*')*\\))*?)${this.nestingSuffix}`);
  }
  interpolate(str, data, lng, options2) {
    let match;
    let value;
    let replaces;
    const defaultData = this.options && this.options.interpolation && this.options.interpolation.defaultVariables || {};
    const handleFormat = (key) => {
      if (key.indexOf(this.formatSeparator) < 0) {
        const path = deepFindWithDefaults(data, defaultData, key, this.options.keySeparator, this.options.ignoreJSONStructure);
        return this.alwaysFormat ? this.format(path, void 0, lng, {
          ...options2,
          ...data,
          interpolationkey: key
        }) : path;
      }
      const p = key.split(this.formatSeparator);
      const k = p.shift().trim();
      const f = p.join(this.formatSeparator).trim();
      return this.format(deepFindWithDefaults(data, defaultData, k, this.options.keySeparator, this.options.ignoreJSONStructure), f, lng, {
        ...options2,
        ...data,
        interpolationkey: k
      });
    };
    this.resetRegExp();
    const missingInterpolationHandler = options2?.missingInterpolationHandler || this.options.missingInterpolationHandler;
    const skipOnVariables = options2?.interpolation?.skipOnVariables !== void 0 ? options2.interpolation.skipOnVariables : this.options.interpolation.skipOnVariables;
    const todos = [{
      regex: this.regexpUnescape,
      safeValue: (val) => regexSafe(val)
    }, {
      regex: this.regexp,
      safeValue: (val) => this.escapeValue ? regexSafe(this.escape(val)) : regexSafe(val)
    }];
    todos.forEach((todo) => {
      replaces = 0;
      while (match = todo.regex.exec(str)) {
        const matchedVar = match[1].trim();
        value = handleFormat(matchedVar);
        if (value === void 0) {
          if (typeof missingInterpolationHandler === "function") {
            const temp = missingInterpolationHandler(str, match, options2);
            value = isString(temp) ? temp : "";
          } else if (options2 && Object.prototype.hasOwnProperty.call(options2, matchedVar)) {
            value = "";
          } else if (skipOnVariables) {
            value = match[0];
            continue;
          } else {
            this.logger.warn(`missed to pass in variable ${matchedVar} for interpolating ${str}`);
            value = "";
          }
        } else if (!isString(value) && !this.useRawValueToEscape) {
          value = makeString(value);
        }
        const safeValue = todo.safeValue(value);
        str = str.replace(match[0], safeValue);
        if (skipOnVariables) {
          todo.regex.lastIndex += value.length;
          todo.regex.lastIndex -= match[0].length;
        } else {
          todo.regex.lastIndex = 0;
        }
        replaces++;
        if (replaces >= this.maxReplaces) {
          break;
        }
      }
    });
    return str;
  }
  nest(str, fc, options2 = {}) {
    let match;
    let value;
    let clonedOptions;
    const handleHasOptions = (key, inheritedOptions) => {
      const sep = this.nestingOptionsSeparator;
      if (key.indexOf(sep) < 0) return key;
      const c = key.split(new RegExp(`${sep}[ ]*{`));
      let optionsString = `{${c[1]}`;
      key = c[0];
      optionsString = this.interpolate(optionsString, clonedOptions);
      const matchedSingleQuotes = optionsString.match(/'/g);
      const matchedDoubleQuotes = optionsString.match(/"/g);
      if ((matchedSingleQuotes?.length ?? 0) % 2 === 0 && !matchedDoubleQuotes || matchedDoubleQuotes.length % 2 !== 0) {
        optionsString = optionsString.replace(/'/g, '"');
      }
      try {
        clonedOptions = JSON.parse(optionsString);
        if (inheritedOptions) clonedOptions = {
          ...inheritedOptions,
          ...clonedOptions
        };
      } catch (e) {
        this.logger.warn(`failed parsing options string in nesting for key ${key}`, e);
        return `${key}${sep}${optionsString}`;
      }
      if (clonedOptions.defaultValue && clonedOptions.defaultValue.indexOf(this.prefix) > -1) delete clonedOptions.defaultValue;
      return key;
    };
    while (match = this.nestingRegexp.exec(str)) {
      let formatters = [];
      clonedOptions = {
        ...options2
      };
      clonedOptions = clonedOptions.replace && !isString(clonedOptions.replace) ? clonedOptions.replace : clonedOptions;
      clonedOptions.applyPostProcessor = false;
      delete clonedOptions.defaultValue;
      const keyEndIndex = /{.*}/.test(match[1]) ? match[1].lastIndexOf("}") + 1 : match[1].indexOf(this.formatSeparator);
      if (keyEndIndex !== -1) {
        formatters = match[1].slice(keyEndIndex).split(this.formatSeparator).map((elem) => elem.trim()).filter(Boolean);
        match[1] = match[1].slice(0, keyEndIndex);
      }
      value = fc(handleHasOptions.call(this, match[1].trim(), clonedOptions), clonedOptions);
      if (value && match[0] === str && !isString(value)) return value;
      if (!isString(value)) value = makeString(value);
      if (!value) {
        this.logger.warn(`missed to resolve ${match[1]} for nesting ${str}`);
        value = "";
      }
      if (formatters.length) {
        value = formatters.reduce((v, f) => this.format(v, f, options2.lng, {
          ...options2,
          interpolationkey: match[1].trim()
        }), value.trim());
      }
      str = str.replace(match[0], value);
      this.regexp.lastIndex = 0;
    }
    return str;
  }
}
const parseFormatStr = (formatStr) => {
  let formatName = formatStr.toLowerCase().trim();
  const formatOptions = {};
  if (formatStr.indexOf("(") > -1) {
    const p = formatStr.split("(");
    formatName = p[0].toLowerCase().trim();
    const optStr = p[1].substring(0, p[1].length - 1);
    if (formatName === "currency" && optStr.indexOf(":") < 0) {
      if (!formatOptions.currency) formatOptions.currency = optStr.trim();
    } else if (formatName === "relativetime" && optStr.indexOf(":") < 0) {
      if (!formatOptions.range) formatOptions.range = optStr.trim();
    } else {
      const opts = optStr.split(";");
      opts.forEach((opt) => {
        if (opt) {
          const [key, ...rest] = opt.split(":");
          const val = rest.join(":").trim().replace(/^'+|'+$/g, "");
          const trimmedKey = key.trim();
          if (!formatOptions[trimmedKey]) formatOptions[trimmedKey] = val;
          if (val === "false") formatOptions[trimmedKey] = false;
          if (val === "true") formatOptions[trimmedKey] = true;
          if (!isNaN(val)) formatOptions[trimmedKey] = parseInt(val, 10);
        }
      });
    }
  }
  return {
    formatName,
    formatOptions
  };
};
const createCachedFormatter = (fn) => {
  const cache = {};
  return (v, l, o) => {
    let optForCache = o;
    if (o && o.interpolationkey && o.formatParams && o.formatParams[o.interpolationkey] && o[o.interpolationkey]) {
      optForCache = {
        ...optForCache,
        [o.interpolationkey]: void 0
      };
    }
    const key = l + JSON.stringify(optForCache);
    let frm = cache[key];
    if (!frm) {
      frm = fn(getCleanedCode(l), o);
      cache[key] = frm;
    }
    return frm(v);
  };
};
const createNonCachedFormatter = (fn) => (v, l, o) => fn(getCleanedCode(l), o)(v);
class Formatter {
  constructor(options2 = {}) {
    this.logger = baseLogger.create("formatter");
    this.options = options2;
    this.init(options2);
  }
  init(services, options2 = {
    interpolation: {}
  }) {
    this.formatSeparator = options2.interpolation.formatSeparator || ",";
    const cf = options2.cacheInBuiltFormats ? createCachedFormatter : createNonCachedFormatter;
    this.formats = {
      number: cf((lng, opt) => {
        const formatter = new Intl.NumberFormat(lng, {
          ...opt
        });
        return (val) => formatter.format(val);
      }),
      currency: cf((lng, opt) => {
        const formatter = new Intl.NumberFormat(lng, {
          ...opt,
          style: "currency"
        });
        return (val) => formatter.format(val);
      }),
      datetime: cf((lng, opt) => {
        const formatter = new Intl.DateTimeFormat(lng, {
          ...opt
        });
        return (val) => formatter.format(val);
      }),
      relativetime: cf((lng, opt) => {
        const formatter = new Intl.RelativeTimeFormat(lng, {
          ...opt
        });
        return (val) => formatter.format(val, opt.range || "day");
      }),
      list: cf((lng, opt) => {
        const formatter = new Intl.ListFormat(lng, {
          ...opt
        });
        return (val) => formatter.format(val);
      })
    };
  }
  add(name, fc) {
    this.formats[name.toLowerCase().trim()] = fc;
  }
  addCached(name, fc) {
    this.formats[name.toLowerCase().trim()] = createCachedFormatter(fc);
  }
  format(value, format, lng, options2 = {}) {
    const formats = format.split(this.formatSeparator);
    if (formats.length > 1 && formats[0].indexOf("(") > 1 && formats[0].indexOf(")") < 0 && formats.find((f) => f.indexOf(")") > -1)) {
      const lastIndex = formats.findIndex((f) => f.indexOf(")") > -1);
      formats[0] = [formats[0], ...formats.splice(1, lastIndex)].join(this.formatSeparator);
    }
    const result = formats.reduce((mem, f) => {
      const {
        formatName,
        formatOptions
      } = parseFormatStr(f);
      if (this.formats[formatName]) {
        let formatted = mem;
        try {
          const valOptions = options2?.formatParams?.[options2.interpolationkey] || {};
          const l = valOptions.locale || valOptions.lng || options2.locale || options2.lng || lng;
          formatted = this.formats[formatName](mem, l, {
            ...formatOptions,
            ...options2,
            ...valOptions
          });
        } catch (error) {
          this.logger.warn(error);
        }
        return formatted;
      } else {
        this.logger.warn(`there was no format function for ${formatName}`);
      }
      return mem;
    }, value);
    return result;
  }
}
const removePending = (q, name) => {
  if (q.pending[name] !== void 0) {
    delete q.pending[name];
    q.pendingCount--;
  }
};
class Connector extends EventEmitter {
  constructor(backend, store, services, options2 = {}) {
    super();
    this.backend = backend;
    this.store = store;
    this.services = services;
    this.languageUtils = services.languageUtils;
    this.options = options2;
    this.logger = baseLogger.create("backendConnector");
    this.waitingReads = [];
    this.maxParallelReads = options2.maxParallelReads || 10;
    this.readingCalls = 0;
    this.maxRetries = options2.maxRetries >= 0 ? options2.maxRetries : 5;
    this.retryTimeout = options2.retryTimeout >= 1 ? options2.retryTimeout : 350;
    this.state = {};
    this.queue = [];
    this.backend?.init?.(services, options2.backend, options2);
  }
  queueLoad(languages2, namespaces, options2, callback) {
    const toLoad = {};
    const pending = {};
    const toLoadLanguages = {};
    const toLoadNamespaces = {};
    languages2.forEach((lng) => {
      let hasAllNamespaces = true;
      namespaces.forEach((ns) => {
        const name = `${lng}|${ns}`;
        if (!options2.reload && this.store.hasResourceBundle(lng, ns)) {
          this.state[name] = 2;
        } else if (this.state[name] < 0) ;
        else if (this.state[name] === 1) {
          if (pending[name] === void 0) pending[name] = true;
        } else {
          this.state[name] = 1;
          hasAllNamespaces = false;
          if (pending[name] === void 0) pending[name] = true;
          if (toLoad[name] === void 0) toLoad[name] = true;
          if (toLoadNamespaces[ns] === void 0) toLoadNamespaces[ns] = true;
        }
      });
      if (!hasAllNamespaces) toLoadLanguages[lng] = true;
    });
    if (Object.keys(toLoad).length || Object.keys(pending).length) {
      this.queue.push({
        pending,
        pendingCount: Object.keys(pending).length,
        loaded: {},
        errors: [],
        callback
      });
    }
    return {
      toLoad: Object.keys(toLoad),
      pending: Object.keys(pending),
      toLoadLanguages: Object.keys(toLoadLanguages),
      toLoadNamespaces: Object.keys(toLoadNamespaces)
    };
  }
  loaded(name, err, data) {
    const s = name.split("|");
    const lng = s[0];
    const ns = s[1];
    if (err) this.emit("failedLoading", lng, ns, err);
    if (!err && data) {
      this.store.addResourceBundle(lng, ns, data, void 0, void 0, {
        skipCopy: true
      });
    }
    this.state[name] = err ? -1 : 2;
    if (err && data) this.state[name] = 0;
    const loaded = {};
    this.queue.forEach((q) => {
      pushPath(q.loaded, [lng], ns);
      removePending(q, name);
      if (err) q.errors.push(err);
      if (q.pendingCount === 0 && !q.done) {
        Object.keys(q.loaded).forEach((l) => {
          if (!loaded[l]) loaded[l] = {};
          const loadedKeys = q.loaded[l];
          if (loadedKeys.length) {
            loadedKeys.forEach((n) => {
              if (loaded[l][n] === void 0) loaded[l][n] = true;
            });
          }
        });
        q.done = true;
        if (q.errors.length) {
          q.callback(q.errors);
        } else {
          q.callback();
        }
      }
    });
    this.emit("loaded", loaded);
    this.queue = this.queue.filter((q) => !q.done);
  }
  read(lng, ns, fcName, tried = 0, wait = this.retryTimeout, callback) {
    if (!lng.length) return callback(null, {});
    if (this.readingCalls >= this.maxParallelReads) {
      this.waitingReads.push({
        lng,
        ns,
        fcName,
        tried,
        wait,
        callback
      });
      return;
    }
    this.readingCalls++;
    const resolver = (err, data) => {
      this.readingCalls--;
      if (this.waitingReads.length > 0) {
        const next = this.waitingReads.shift();
        this.read(next.lng, next.ns, next.fcName, next.tried, next.wait, next.callback);
      }
      if (err && data && tried < this.maxRetries) {
        setTimeout(() => {
          this.read.call(this, lng, ns, fcName, tried + 1, wait * 2, callback);
        }, wait);
        return;
      }
      callback(err, data);
    };
    const fc = this.backend[fcName].bind(this.backend);
    if (fc.length === 2) {
      try {
        const r = fc(lng, ns);
        if (r && typeof r.then === "function") {
          r.then((data) => resolver(null, data)).catch(resolver);
        } else {
          resolver(null, r);
        }
      } catch (err) {
        resolver(err);
      }
      return;
    }
    return fc(lng, ns, resolver);
  }
  prepareLoading(languages2, namespaces, options2 = {}, callback) {
    if (!this.backend) {
      this.logger.warn("No backend was added via i18next.use. Will not load resources.");
      return callback && callback();
    }
    if (isString(languages2)) languages2 = this.languageUtils.toResolveHierarchy(languages2);
    if (isString(namespaces)) namespaces = [namespaces];
    const toLoad = this.queueLoad(languages2, namespaces, options2, callback);
    if (!toLoad.toLoad.length) {
      if (!toLoad.pending.length) callback();
      return null;
    }
    toLoad.toLoad.forEach((name) => {
      this.loadOne(name);
    });
  }
  load(languages2, namespaces, callback) {
    this.prepareLoading(languages2, namespaces, {}, callback);
  }
  reload(languages2, namespaces, callback) {
    this.prepareLoading(languages2, namespaces, {
      reload: true
    }, callback);
  }
  loadOne(name, prefix = "") {
    const s = name.split("|");
    const lng = s[0];
    const ns = s[1];
    this.read(lng, ns, "read", void 0, void 0, (err, data) => {
      if (err) this.logger.warn(`${prefix}loading namespace ${ns} for language ${lng} failed`, err);
      if (!err && data) this.logger.log(`${prefix}loaded namespace ${ns} for language ${lng}`, data);
      this.loaded(name, err, data);
    });
  }
  saveMissing(languages2, namespace, key, fallbackValue, isUpdate, options2 = {}, clb = () => {
  }) {
    if (this.services?.utils?.hasLoadedNamespace && !this.services?.utils?.hasLoadedNamespace(namespace)) {
      this.logger.warn(`did not save key "${key}" as the namespace "${namespace}" was not yet loaded`, "This means something IS WRONG in your setup. You access the t function before i18next.init / i18next.loadNamespace / i18next.changeLanguage was done. Wait for the callback or Promise to resolve before accessing it!!!");
      return;
    }
    if (key === void 0 || key === null || key === "") return;
    if (this.backend?.create) {
      const opts = {
        ...options2,
        isUpdate
      };
      const fc = this.backend.create.bind(this.backend);
      if (fc.length < 6) {
        try {
          let r;
          if (fc.length === 5) {
            r = fc(languages2, namespace, key, fallbackValue, opts);
          } else {
            r = fc(languages2, namespace, key, fallbackValue);
          }
          if (r && typeof r.then === "function") {
            r.then((data) => clb(null, data)).catch(clb);
          } else {
            clb(null, r);
          }
        } catch (err) {
          clb(err);
        }
      } else {
        fc(languages2, namespace, key, fallbackValue, clb, opts);
      }
    }
    if (!languages2 || !languages2[0]) return;
    this.store.addResource(languages2[0], namespace, key, fallbackValue);
  }
}
const get = () => ({
  debug: false,
  initAsync: true,
  ns: ["translation"],
  defaultNS: ["translation"],
  fallbackLng: ["dev"],
  fallbackNS: false,
  supportedLngs: false,
  nonExplicitSupportedLngs: false,
  load: "all",
  preload: false,
  simplifyPluralSuffix: true,
  keySeparator: ".",
  nsSeparator: ":",
  pluralSeparator: "_",
  contextSeparator: "_",
  partialBundledLanguages: false,
  saveMissing: false,
  updateMissing: false,
  saveMissingTo: "fallback",
  saveMissingPlurals: true,
  missingKeyHandler: false,
  missingInterpolationHandler: false,
  postProcess: false,
  postProcessPassResolved: false,
  returnNull: false,
  returnEmptyString: true,
  returnObjects: false,
  joinArrays: false,
  returnedObjectHandler: false,
  parseMissingKeyHandler: false,
  appendNamespaceToMissingKey: false,
  appendNamespaceToCIMode: false,
  overloadTranslationOptionHandler: (args) => {
    let ret = {};
    if (typeof args[1] === "object") ret = args[1];
    if (isString(args[1])) ret.defaultValue = args[1];
    if (isString(args[2])) ret.tDescription = args[2];
    if (typeof args[2] === "object" || typeof args[3] === "object") {
      const options2 = args[3] || args[2];
      Object.keys(options2).forEach((key) => {
        ret[key] = options2[key];
      });
    }
    return ret;
  },
  interpolation: {
    escapeValue: true,
    format: (value) => value,
    prefix: "{{",
    suffix: "}}",
    formatSeparator: ",",
    unescapePrefix: "-",
    nestingPrefix: "$t(",
    nestingSuffix: ")",
    nestingOptionsSeparator: ",",
    maxReplaces: 1e3,
    skipOnVariables: true
  },
  cacheInBuiltFormats: true
});
const transformOptions = (options2) => {
  if (isString(options2.ns)) options2.ns = [options2.ns];
  if (isString(options2.fallbackLng)) options2.fallbackLng = [options2.fallbackLng];
  if (isString(options2.fallbackNS)) options2.fallbackNS = [options2.fallbackNS];
  if (options2.supportedLngs?.indexOf?.("cimode") < 0) {
    options2.supportedLngs = options2.supportedLngs.concat(["cimode"]);
  }
  if (typeof options2.initImmediate === "boolean") options2.initAsync = options2.initImmediate;
  return options2;
};
const noop = () => {
};
const bindMemberFunctions = (inst) => {
  const mems = Object.getOwnPropertyNames(Object.getPrototypeOf(inst));
  mems.forEach((mem) => {
    if (typeof inst[mem] === "function") {
      inst[mem] = inst[mem].bind(inst);
    }
  });
};
let supportNoticeShown = false;
const usesLocize = (inst) => {
  if (inst?.modules?.backend?.name?.indexOf("Locize") > 0) return true;
  if (inst?.modules?.backend?.constructor?.name?.indexOf("Locize") > 0) return true;
  if (inst?.options?.backend?.backends) {
    if (inst.options.backend.backends.some((b) => b?.name?.indexOf("Locize") > 0 || b?.constructor?.name?.indexOf("Locize") > 0)) return true;
  }
  return false;
};
class I18n extends EventEmitter {
  constructor(options2 = {}, callback) {
    super();
    this.options = transformOptions(options2);
    this.services = {};
    this.logger = baseLogger;
    this.modules = {
      external: []
    };
    bindMemberFunctions(this);
    if (callback && !this.isInitialized && !options2.isClone) {
      if (!this.options.initAsync) {
        this.init(options2, callback);
        return this;
      }
      setTimeout(() => {
        this.init(options2, callback);
      }, 0);
    }
  }
  init(options2 = {}, callback) {
    this.isInitializing = true;
    if (typeof options2 === "function") {
      callback = options2;
      options2 = {};
    }
    if (options2.defaultNS == null && options2.ns) {
      if (isString(options2.ns)) {
        options2.defaultNS = options2.ns;
      } else if (options2.ns.indexOf("translation") < 0) {
        options2.defaultNS = options2.ns[0];
      }
    }
    const defOpts = get();
    this.options = {
      ...defOpts,
      ...this.options,
      ...transformOptions(options2)
    };
    this.options.interpolation = {
      ...defOpts.interpolation,
      ...this.options.interpolation
    };
    if (options2.keySeparator !== void 0) {
      this.options.userDefinedKeySeparator = options2.keySeparator;
    }
    if (options2.nsSeparator !== void 0) {
      this.options.userDefinedNsSeparator = options2.nsSeparator;
    }
    if (typeof this.options.overloadTranslationOptionHandler !== "function") {
      this.options.overloadTranslationOptionHandler = defOpts.overloadTranslationOptionHandler;
    }
    if (this.options.showSupportNotice !== false && !usesLocize(this) && !supportNoticeShown) {
      if (typeof console !== "undefined" && typeof console.info !== "undefined") console.info("🌐 i18next is maintained with support from Locize — consider powering your project with managed localization (AI, CDN, integrations): https://locize.com 💙");
      supportNoticeShown = true;
    }
    const createClassOnDemand = (ClassOrObject) => {
      if (!ClassOrObject) return null;
      if (typeof ClassOrObject === "function") return new ClassOrObject();
      return ClassOrObject;
    };
    if (!this.options.isClone) {
      if (this.modules.logger) {
        baseLogger.init(createClassOnDemand(this.modules.logger), this.options);
      } else {
        baseLogger.init(null, this.options);
      }
      let formatter;
      if (this.modules.formatter) {
        formatter = this.modules.formatter;
      } else {
        formatter = Formatter;
      }
      const lu = new LanguageUtil(this.options);
      this.store = new ResourceStore(this.options.resources, this.options);
      const s = this.services;
      s.logger = baseLogger;
      s.resourceStore = this.store;
      s.languageUtils = lu;
      s.pluralResolver = new PluralResolver(lu, {
        prepend: this.options.pluralSeparator,
        simplifyPluralSuffix: this.options.simplifyPluralSuffix
      });
      const usingLegacyFormatFunction = this.options.interpolation.format && this.options.interpolation.format !== defOpts.interpolation.format;
      if (usingLegacyFormatFunction) {
        this.logger.deprecate(`init: you are still using the legacy format function, please use the new approach: https://www.i18next.com/translation-function/formatting`);
      }
      if (formatter && (!this.options.interpolation.format || this.options.interpolation.format === defOpts.interpolation.format)) {
        s.formatter = createClassOnDemand(formatter);
        if (s.formatter.init) s.formatter.init(s, this.options);
        this.options.interpolation.format = s.formatter.format.bind(s.formatter);
      }
      s.interpolator = new Interpolator(this.options);
      s.utils = {
        hasLoadedNamespace: this.hasLoadedNamespace.bind(this)
      };
      s.backendConnector = new Connector(createClassOnDemand(this.modules.backend), s.resourceStore, s, this.options);
      s.backendConnector.on("*", (event, ...args) => {
        this.emit(event, ...args);
      });
      if (this.modules.languageDetector) {
        s.languageDetector = createClassOnDemand(this.modules.languageDetector);
        if (s.languageDetector.init) s.languageDetector.init(s, this.options.detection, this.options);
      }
      if (this.modules.i18nFormat) {
        s.i18nFormat = createClassOnDemand(this.modules.i18nFormat);
        if (s.i18nFormat.init) s.i18nFormat.init(this);
      }
      this.translator = new Translator(this.services, this.options);
      this.translator.on("*", (event, ...args) => {
        this.emit(event, ...args);
      });
      this.modules.external.forEach((m) => {
        if (m.init) m.init(this);
      });
    }
    this.format = this.options.interpolation.format;
    if (!callback) callback = noop;
    if (this.options.fallbackLng && !this.services.languageDetector && !this.options.lng) {
      const codes = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
      if (codes.length > 0 && codes[0] !== "dev") this.options.lng = codes[0];
    }
    if (!this.services.languageDetector && !this.options.lng) {
      this.logger.warn("init: no languageDetector is used and no lng is defined");
    }
    const storeApi = ["getResource", "hasResourceBundle", "getResourceBundle", "getDataByLanguage"];
    storeApi.forEach((fcName) => {
      this[fcName] = (...args) => this.store[fcName](...args);
    });
    const storeApiChained = ["addResource", "addResources", "addResourceBundle", "removeResourceBundle"];
    storeApiChained.forEach((fcName) => {
      this[fcName] = (...args) => {
        this.store[fcName](...args);
        return this;
      };
    });
    const deferred = defer();
    const load = () => {
      const finish = (err, t2) => {
        this.isInitializing = false;
        if (this.isInitialized && !this.initializedStoreOnce) this.logger.warn("init: i18next is already initialized. You should call init just once!");
        this.isInitialized = true;
        if (!this.options.isClone) this.logger.log("initialized", this.options);
        this.emit("initialized", this.options);
        deferred.resolve(t2);
        callback(err, t2);
      };
      if (this.languages && !this.isInitialized) return finish(null, this.t.bind(this));
      this.changeLanguage(this.options.lng, finish);
    };
    if (this.options.resources || !this.options.initAsync) {
      load();
    } else {
      setTimeout(load, 0);
    }
    return deferred;
  }
  loadResources(language, callback = noop) {
    let usedCallback = callback;
    const usedLng = isString(language) ? language : this.language;
    if (typeof language === "function") usedCallback = language;
    if (!this.options.resources || this.options.partialBundledLanguages) {
      if (usedLng?.toLowerCase() === "cimode" && (!this.options.preload || this.options.preload.length === 0)) return usedCallback();
      const toLoad = [];
      const append = (lng) => {
        if (!lng) return;
        if (lng === "cimode") return;
        const lngs = this.services.languageUtils.toResolveHierarchy(lng);
        lngs.forEach((l) => {
          if (l === "cimode") return;
          if (toLoad.indexOf(l) < 0) toLoad.push(l);
        });
      };
      if (!usedLng) {
        const fallbacks = this.services.languageUtils.getFallbackCodes(this.options.fallbackLng);
        fallbacks.forEach((l) => append(l));
      } else {
        append(usedLng);
      }
      this.options.preload?.forEach?.((l) => append(l));
      this.services.backendConnector.load(toLoad, this.options.ns, (e) => {
        if (!e && !this.resolvedLanguage && this.language) this.setResolvedLanguage(this.language);
        usedCallback(e);
      });
    } else {
      usedCallback(null);
    }
  }
  reloadResources(lngs, ns, callback) {
    const deferred = defer();
    if (typeof lngs === "function") {
      callback = lngs;
      lngs = void 0;
    }
    if (typeof ns === "function") {
      callback = ns;
      ns = void 0;
    }
    if (!lngs) lngs = this.languages;
    if (!ns) ns = this.options.ns;
    if (!callback) callback = noop;
    this.services.backendConnector.reload(lngs, ns, (err) => {
      deferred.resolve();
      callback(err);
    });
    return deferred;
  }
  use(module) {
    if (!module) throw new Error("You are passing an undefined module! Please check the object you are passing to i18next.use()");
    if (!module.type) throw new Error("You are passing a wrong module! Please check the object you are passing to i18next.use()");
    if (module.type === "backend") {
      this.modules.backend = module;
    }
    if (module.type === "logger" || module.log && module.warn && module.error) {
      this.modules.logger = module;
    }
    if (module.type === "languageDetector") {
      this.modules.languageDetector = module;
    }
    if (module.type === "i18nFormat") {
      this.modules.i18nFormat = module;
    }
    if (module.type === "postProcessor") {
      postProcessor.addPostProcessor(module);
    }
    if (module.type === "formatter") {
      this.modules.formatter = module;
    }
    if (module.type === "3rdParty") {
      this.modules.external.push(module);
    }
    return this;
  }
  setResolvedLanguage(l) {
    if (!l || !this.languages) return;
    if (["cimode", "dev"].indexOf(l) > -1) return;
    for (let li = 0; li < this.languages.length; li++) {
      const lngInLngs = this.languages[li];
      if (["cimode", "dev"].indexOf(lngInLngs) > -1) continue;
      if (this.store.hasLanguageSomeTranslations(lngInLngs)) {
        this.resolvedLanguage = lngInLngs;
        break;
      }
    }
    if (!this.resolvedLanguage && this.languages.indexOf(l) < 0 && this.store.hasLanguageSomeTranslations(l)) {
      this.resolvedLanguage = l;
      this.languages.unshift(l);
    }
  }
  changeLanguage(lng, callback) {
    this.isLanguageChangingTo = lng;
    const deferred = defer();
    this.emit("languageChanging", lng);
    const setLngProps = (l) => {
      this.language = l;
      this.languages = this.services.languageUtils.toResolveHierarchy(l);
      this.resolvedLanguage = void 0;
      this.setResolvedLanguage(l);
    };
    const done = (err, l) => {
      if (l) {
        if (this.isLanguageChangingTo === lng) {
          setLngProps(l);
          this.translator.changeLanguage(l);
          this.isLanguageChangingTo = void 0;
          this.emit("languageChanged", l);
          this.logger.log("languageChanged", l);
        }
      } else {
        this.isLanguageChangingTo = void 0;
      }
      deferred.resolve((...args) => this.t(...args));
      if (callback) callback(err, (...args) => this.t(...args));
    };
    const setLng = (lngs) => {
      if (!lng && !lngs && this.services.languageDetector) lngs = [];
      const fl = isString(lngs) ? lngs : lngs && lngs[0];
      const l = this.store.hasLanguageSomeTranslations(fl) ? fl : this.services.languageUtils.getBestMatchFromCodes(isString(lngs) ? [lngs] : lngs);
      if (l) {
        if (!this.language) {
          setLngProps(l);
        }
        if (!this.translator.language) this.translator.changeLanguage(l);
        this.services.languageDetector?.cacheUserLanguage?.(l);
      }
      this.loadResources(l, (err) => {
        done(err, l);
      });
    };
    if (!lng && this.services.languageDetector && !this.services.languageDetector.async) {
      setLng(this.services.languageDetector.detect());
    } else if (!lng && this.services.languageDetector && this.services.languageDetector.async) {
      if (this.services.languageDetector.detect.length === 0) {
        this.services.languageDetector.detect().then(setLng);
      } else {
        this.services.languageDetector.detect(setLng);
      }
    } else {
      setLng(lng);
    }
    return deferred;
  }
  getFixedT(lng, ns, keyPrefix) {
    const fixedT = (key, opts, ...rest) => {
      let o;
      if (typeof opts !== "object") {
        o = this.options.overloadTranslationOptionHandler([key, opts].concat(rest));
      } else {
        o = {
          ...opts
        };
      }
      o.lng = o.lng || fixedT.lng;
      o.lngs = o.lngs || fixedT.lngs;
      o.ns = o.ns || fixedT.ns;
      if (o.keyPrefix !== "") o.keyPrefix = o.keyPrefix || keyPrefix || fixedT.keyPrefix;
      const keySeparator = this.options.keySeparator || ".";
      let resultKey;
      if (o.keyPrefix && Array.isArray(key)) {
        resultKey = key.map((k) => {
          if (typeof k === "function") k = keysFromSelector(k, {
            ...this.options,
            ...opts
          });
          return `${o.keyPrefix}${keySeparator}${k}`;
        });
      } else {
        if (typeof key === "function") key = keysFromSelector(key, {
          ...this.options,
          ...opts
        });
        resultKey = o.keyPrefix ? `${o.keyPrefix}${keySeparator}${key}` : key;
      }
      return this.t(resultKey, o);
    };
    if (isString(lng)) {
      fixedT.lng = lng;
    } else {
      fixedT.lngs = lng;
    }
    fixedT.ns = ns;
    fixedT.keyPrefix = keyPrefix;
    return fixedT;
  }
  t(...args) {
    return this.translator?.translate(...args);
  }
  exists(...args) {
    return this.translator?.exists(...args);
  }
  setDefaultNamespace(ns) {
    this.options.defaultNS = ns;
  }
  hasLoadedNamespace(ns, options2 = {}) {
    if (!this.isInitialized) {
      this.logger.warn("hasLoadedNamespace: i18next was not initialized", this.languages);
      return false;
    }
    if (!this.languages || !this.languages.length) {
      this.logger.warn("hasLoadedNamespace: i18n.languages were undefined or empty", this.languages);
      return false;
    }
    const lng = options2.lng || this.resolvedLanguage || this.languages[0];
    const fallbackLng = this.options ? this.options.fallbackLng : false;
    const lastLng = this.languages[this.languages.length - 1];
    if (lng.toLowerCase() === "cimode") return true;
    const loadNotPending = (l, n) => {
      const loadState = this.services.backendConnector.state[`${l}|${n}`];
      return loadState === -1 || loadState === 0 || loadState === 2;
    };
    if (options2.precheck) {
      const preResult = options2.precheck(this, loadNotPending);
      if (preResult !== void 0) return preResult;
    }
    if (this.hasResourceBundle(lng, ns)) return true;
    if (!this.services.backendConnector.backend || this.options.resources && !this.options.partialBundledLanguages) return true;
    if (loadNotPending(lng, ns) && (!fallbackLng || loadNotPending(lastLng, ns))) return true;
    return false;
  }
  loadNamespaces(ns, callback) {
    const deferred = defer();
    if (!this.options.ns) {
      if (callback) callback();
      return Promise.resolve();
    }
    if (isString(ns)) ns = [ns];
    ns.forEach((n) => {
      if (this.options.ns.indexOf(n) < 0) this.options.ns.push(n);
    });
    this.loadResources((err) => {
      deferred.resolve();
      if (callback) callback(err);
    });
    return deferred;
  }
  loadLanguages(lngs, callback) {
    const deferred = defer();
    if (isString(lngs)) lngs = [lngs];
    const preloaded = this.options.preload || [];
    const newLngs = lngs.filter((lng) => preloaded.indexOf(lng) < 0 && this.services.languageUtils.isSupportedCode(lng));
    if (!newLngs.length) {
      if (callback) callback();
      return Promise.resolve();
    }
    this.options.preload = preloaded.concat(newLngs);
    this.loadResources((err) => {
      deferred.resolve();
      if (callback) callback(err);
    });
    return deferred;
  }
  dir(lng) {
    if (!lng) lng = this.resolvedLanguage || (this.languages?.length > 0 ? this.languages[0] : this.language);
    if (!lng) return "rtl";
    try {
      const l = new Intl.Locale(lng);
      if (l && l.getTextInfo) {
        const ti = l.getTextInfo();
        if (ti && ti.direction) return ti.direction;
      }
    } catch (e) {
    }
    const rtlLngs = ["ar", "shu", "sqr", "ssh", "xaa", "yhd", "yud", "aao", "abh", "abv", "acm", "acq", "acw", "acx", "acy", "adf", "ads", "aeb", "aec", "afb", "ajp", "apc", "apd", "arb", "arq", "ars", "ary", "arz", "auz", "avl", "ayh", "ayl", "ayn", "ayp", "bbz", "pga", "he", "iw", "ps", "pbt", "pbu", "pst", "prp", "prd", "ug", "ur", "ydd", "yds", "yih", "ji", "yi", "hbo", "men", "xmn", "fa", "jpr", "peo", "pes", "prs", "dv", "sam", "ckb"];
    const languageUtils = this.services?.languageUtils || new LanguageUtil(get());
    if (lng.toLowerCase().indexOf("-latn") > 1) return "ltr";
    return rtlLngs.indexOf(languageUtils.getLanguagePartFromCode(lng)) > -1 || lng.toLowerCase().indexOf("-arab") > 1 ? "rtl" : "ltr";
  }
  static createInstance(options2 = {}, callback) {
    const instance2 = new I18n(options2, callback);
    instance2.createInstance = I18n.createInstance;
    return instance2;
  }
  cloneInstance(options2 = {}, callback = noop) {
    const forkResourceStore = options2.forkResourceStore;
    if (forkResourceStore) delete options2.forkResourceStore;
    const mergedOptions = {
      ...this.options,
      ...options2,
      ...{
        isClone: true
      }
    };
    const clone = new I18n(mergedOptions);
    if (options2.debug !== void 0 || options2.prefix !== void 0) {
      clone.logger = clone.logger.clone(options2);
    }
    const membersToCopy = ["store", "services", "language"];
    membersToCopy.forEach((m) => {
      clone[m] = this[m];
    });
    clone.services = {
      ...this.services
    };
    clone.services.utils = {
      hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone)
    };
    if (forkResourceStore) {
      const clonedData = Object.keys(this.store.data).reduce((prev, l) => {
        prev[l] = {
          ...this.store.data[l]
        };
        prev[l] = Object.keys(prev[l]).reduce((acc, n) => {
          acc[n] = {
            ...prev[l][n]
          };
          return acc;
        }, prev[l]);
        return prev;
      }, {});
      clone.store = new ResourceStore(clonedData, mergedOptions);
      clone.services.resourceStore = clone.store;
    }
    if (options2.interpolation) {
      const defOpts = get();
      const mergedInterpolation = {
        ...defOpts.interpolation,
        ...this.options.interpolation,
        ...options2.interpolation
      };
      const mergedForInterpolator = {
        ...mergedOptions,
        interpolation: mergedInterpolation
      };
      clone.services.interpolator = new Interpolator(mergedForInterpolator);
    }
    clone.translator = new Translator(clone.services, mergedOptions);
    clone.translator.on("*", (event, ...args) => {
      clone.emit(event, ...args);
    });
    clone.init(mergedOptions, callback);
    clone.translator.options = mergedOptions;
    clone.translator.backendConnector.services.utils = {
      hasLoadedNamespace: clone.hasLoadedNamespace.bind(clone)
    };
    return clone;
  }
  toJSON() {
    return {
      options: this.options,
      store: this.store,
      language: this.language,
      languages: this.languages,
      resolvedLanguage: this.resolvedLanguage
    };
  }
}
const instance = I18n.createInstance();
instance.createInstance;
instance.dir;
instance.init;
instance.loadResources;
instance.reloadResources;
instance.use;
instance.changeLanguage;
instance.getFixedT;
instance.t;
instance.exists;
instance.setDefaultNamespace;
instance.hasLoadedNamespace;
instance.loadNamespaces;
instance.loadLanguages;
const app$1 = { "windowTitle": "Namaz Vakti Desktop", "heading": "Iqamah Schedule Generator" };
const labels$1 = { "uiLanguage": "Application Language", "uiLanguageShort": "Language", "tsvFolder": "TSV Folder", "outputFolder": "Output Folder", "month": "Month", "outputLocale": "Output Language (Generated Content)", "timeFormat": "Time Format", "baseGroupSize": "Base Group Size", "ramazanHesabi": "Ramadan calculation", "fajrLatestLimitEnabled": "Fajr no later than", "zhuhrEarliestLimitEnabled": "Zhuhr no earlier than", "zhuhrSingleLimit": "Zhuhr single limit", "zhuhrStdDstLimits": "Zhuhr standard/daylight limits", "announcementMessage": "Announcement" };
const buttons$1 = { "browse": "Browse", "refresh": "Refresh", "advanced": "Advanced...", "generatePng": "Generate PNG", "generateXlsx": "Generate XLSX", "switchToEnglish": "English", "switchToTurkish": "Türkçe" };
const options$1 = { "outputLocale": { "en": "English", "tr": "Turkish" }, "timeFormat": { "ampm": "AM/PM", "h24": "24h" }, "zhuhrLimitMode": { "single": "Single limit", "stdDst": "Standard/daylight" }, "zhuhrGroup": { "single": "Single", "standard": "Standard", "daylight": "Daylight" } };
const placeholders$1 = { "announcementMessage": "Message shown above and below the table" };
const languages$1 = { "en": "English", "tr": "Türkçe" };
const time$1 = { "am": "AM", "pm": "PM" };
const errors$1 = { "pickTsvFailed": "pickTsv failed", "pickOutputFailed": "pickOutput failed", "refreshMonthsFailed": "refreshMonths failed", "generateFailed": "generate failed" };
const logs$1 = { "preloadMissing": "ERROR: window.appApi is undefined. Preload did not load.", "appApiReady": "appApi ready. Methods: {{methods}}", "pickTsvClicked": "pickTsv clicked", "pickTsvResult": "pickTsv result: {{path}}", "pickOutputClicked": "pickOutput clicked", "pickOutputResult": "pickOutput result: {{path}}", "generateClicked": "generate {{target}} clicked for {{month}}", "setTsvFolderFirst": "Set TSV folder first.", "refreshMonthsFor": "refreshMonths for {{folder}}", "noMonthFilesFound": "No month files found in folder.", "foundMonths": "Found months: {{months}}", "restoredLastEntries": "Restored last entries.", "errorWithDetails": "ERROR: {{prefix}} -> {{details}}" };
const validation$1 = { "monthRequired": "Month is required.", "outputFolderRequired": "Output folder is required.", "tsvFolderRequired": "TSV folder is required." };
const status$1 = { "validationFailed": "Cannot generate. {{details}}", "generatePngSuccess": "PNG generated: {{pngPath}} | Warnings: {{warnings}}", "generateXlsxSuccess": "XLSX generated: {{xlsxPath}} | Warnings: {{warnings}}", "generateFailed": "Generate {{target}} failed: {{details}}" };
const common$1 = { "cancelled": "<cancelled>", "none": "none" };
const en = {
  app: app$1,
  labels: labels$1,
  buttons: buttons$1,
  options: options$1,
  placeholders: placeholders$1,
  languages: languages$1,
  time: time$1,
  errors: errors$1,
  logs: logs$1,
  validation: validation$1,
  status: status$1,
  common: common$1
};
const app = { "windowTitle": "Namaz Vakti Masaüstü", "heading": "Kametleme Çizelgesi Oluşturucu" };
const labels = { "uiLanguage": "Uygulama dili", "uiLanguageShort": "Dil", "tsvFolder": "TSV klasörü", "outputFolder": "Çıktı klasörü", "month": "Ay", "outputLocale": "Çıktı dili (üretilen içerik)", "timeFormat": "Saat biçimi", "baseGroupSize": "Temel grup boyutu", "ramazanHesabi": "Ramazan hesabı", "fajrLatestLimitEnabled": "Fajr en geç", "zhuhrEarliestLimitEnabled": "Zuhr en erken", "zhuhrSingleLimit": "Zuhr tek limit", "zhuhrStdDstLimits": "Zuhr standart/yaz saati limitleri", "announcementMessage": "Duyuru" };
const buttons = { "browse": "Gözat", "refresh": "Yenile", "advanced": "Gelişmiş...", "generatePng": "PNG üret", "generateXlsx": "XLSX üret", "switchToEnglish": "English", "switchToTurkish": "Türkçe" };
const options = { "outputLocale": { "en": "İngilizce", "tr": "Türkçe" }, "timeFormat": { "ampm": "ÖÖ/ÖS", "h24": "24 saat" }, "zhuhrLimitMode": { "single": "Tek limit", "stdDst": "Standart/yaz saati" }, "zhuhrGroup": { "single": "Tek", "standard": "Standart", "daylight": "Yaz saati" } };
const placeholders = { "announcementMessage": "Tablonun üstünde ve altında gösterilen mesaj" };
const languages = { "en": "English", "tr": "Türkçe" };
const time = { "am": "ÖÖ", "pm": "ÖS" };
const errors = { "pickTsvFailed": "TSV klasörü seçimi başarısız", "pickOutputFailed": "Çıktı klasörü seçimi başarısız", "refreshMonthsFailed": "Ay yenileme başarısız", "generateFailed": "Üretim başarısız" };
const logs = { "preloadMissing": "HATA: window.appApi tanımsız. Preload yüklenmedi.", "appApiReady": "appApi hazır. Yöntemler: {{methods}}", "pickTsvClicked": "TSV seçimi düğmesine tıklandı", "pickTsvResult": "TSV seçimi sonucu: {{path}}", "pickOutputClicked": "Çıktı klasörü seçimi düğmesine tıklandı", "pickOutputResult": "Çıktı klasörü seçimi sonucu: {{path}}", "generateClicked": "{{month}} için {{target}} üret tıklandı", "setTsvFolderFirst": "Önce TSV klasörünü seçin.", "refreshMonthsFor": "{{folder}} için aylar yenileniyor", "noMonthFilesFound": "Klasörde ay dosyası bulunamadı.", "foundMonths": "Bulunan aylar: {{months}}", "restoredLastEntries": "Son girişler geri yüklendi.", "errorWithDetails": "HATA: {{prefix}} -> {{details}}" };
const validation = { "monthRequired": "Ay seçimi zorunludur.", "outputFolderRequired": "Çıktı klasörü zorunludur.", "tsvFolderRequired": "TSV klasörü zorunludur." };
const status = { "validationFailed": "Üretim başlatılamadı. {{details}}", "generatePngSuccess": "PNG üretildi: {{pngPath}} | Uyarılar: {{warnings}}", "generateXlsxSuccess": "XLSX üretildi: {{xlsxPath}} | Uyarılar: {{warnings}}", "generateFailed": "{{target}} üretimi başarısız: {{details}}" };
const common = { "cancelled": "<iptal edildi>", "none": "yok" };
const tr = {
  app,
  labels,
  buttons,
  options,
  placeholders,
  languages,
  time,
  errors,
  logs,
  validation,
  status,
  common
};
const UI_LANGUAGE_STORAGE_KEY = "namaz-vakti:ui-language:v1";
function normalizeLanguage(input) {
  return input?.toLowerCase().startsWith("tr") ? "tr" : "en";
}
async function initializeI18n(savedLanguage) {
  const language = normalizeLanguage(savedLanguage ?? navigator.language);
  await instance.init({
    lng: language,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    resources: {
      en: { translation: en },
      tr: { translation: tr }
    }
  });
  return language;
}
function t(key, options2) {
  return instance.t(key, options2);
}
async function setUiLanguage(language) {
  await instance.changeLanguage(language);
}
function getUiLanguage() {
  return normalizeLanguage(instance.resolvedLanguage ?? instance.language);
}
function getNextUiLanguage() {
  return getUiLanguage() === "en" ? "tr" : "en";
}
function translateStaticDocumentText() {
  document.documentElement.lang = getUiLanguage();
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (!key) {
      return;
    }
    el.textContent = t(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (!key) {
      return;
    }
    el.setAttribute("placeholder", t(key));
  });
}
const tsvFolderInput = getEl("tsvFolder");
const outputFolderInput = getEl("outputFolder");
const switchUiLanguageButton = getEl("switchUiLanguage");
const monthSelect = getEl("month");
const localeSelect = getEl("locale");
const timeFormatSelect = getEl("timeFormat");
const baseGroupSizeSelect = getEl("baseGroupSize");
const ramazanHesabiInput = getEl("ramazanHesabi");
const announcementMessageInput = getEl("announcementMessage");
const fajrLatestLimitEnabledInput = getEl("fajrLatestLimitEnabled");
const fajrHourInput = getEl("fajrHour");
const fajrMinuteInput = getEl("fajrMinute");
const fajrAmPmLabel = getEl("fajrAmPm");
const zhuhrEarliestLimitEnabledInput = getEl("zhuhrEarliestLimitEnabled");
const zhuhrLimitModeSelect = getEl("zhuhrLimitMode");
const zhuhrStdDstRow = getEl("zhuhrStdDstRow");
const zhuhrSingleGroup = getEl("zhuhrSingleGroup");
const zhuhrDualGroup = getEl("zhuhrDualGroup");
const zhuhrSingleHourInput = getEl("zhuhrSingleHour");
const zhuhrSingleMinuteInput = getEl("zhuhrSingleMinute");
const zhuhrSingleAmPmLabel = getEl("zhuhrSingleAmPm");
const zhuhrStdHourInput = getEl("zhuhrStdHour");
const zhuhrStdMinuteInput = getEl("zhuhrStdMinute");
const zhuhrStdAmPmLabel = getEl("zhuhrStdAmPm");
const zhuhrDstHourInput = getEl("zhuhrDstHour");
const zhuhrDstMinuteInput = getEl("zhuhrDstMinute");
const zhuhrDstAmPmLabel = getEl("zhuhrDstAmPm");
const statusMessageEl = getEl("statusMessage");
const generatePngButton = getEl("generatePng");
const generateXlsxButton = getEl("generateXlsx");
const DEFAULT_TSV_FOLDER = "assets/out_monthly";
const LAST_ENTRIES_KEY = "namaz-vakti:last-entries:v2";
let fajrLatestLimitMinutesState = 390;
let zhuhrSingleLimitMinutesState = 730;
let zhuhrStandardLimitMinutesState = 750;
let zhuhrDaylightLimitMinutesState = 810;
let isGenerating = false;
void bootstrap();
async function bootstrap() {
  const savedUiLanguage = localStorage.getItem(UI_LANGUAGE_STORAGE_KEY);
  await initializeI18n(savedUiLanguage);
  applyUiTranslations();
  if (!window.appApi) {
    log(t("logs.preloadMissing"));
    return;
  }
  bindPersistence();
  bindUiLanguageSwitch();
  await restoreLastEntries();
  bindFajrLimitControls();
  bindZhuhrLimitControls();
  syncFajrLimitUi();
  syncZhuhrLimitUi();
  log(t("logs.appApiReady", { methods: Object.keys(window.appApi).join(", ") }));
  getEl("pickTsv").addEventListener("click", async () => {
    try {
      log(t("logs.pickTsvClicked"));
      const path = await window.appApi.selectTsvFolder();
      log(t("logs.pickTsvResult", { path: path ?? t("common.cancelled") }));
      if (path) {
        tsvFolderInput.value = path;
        saveLastEntries();
        await refreshMonths();
      }
    } catch (error) {
      logError("errors.pickTsvFailed", error);
    }
  });
  getEl("pickOutput").addEventListener("click", async () => {
    try {
      log(t("logs.pickOutputClicked"));
      const path = await window.appApi.selectOutputFolder();
      log(t("logs.pickOutputResult", { path: path ?? t("common.cancelled") }));
      if (path) {
        outputFolderInput.value = path;
        saveLastEntries();
      }
    } catch (error) {
      logError("errors.pickOutputFailed", error);
    }
  });
  getEl("refreshMonths").addEventListener("click", async () => {
    try {
      await refreshMonths();
    } catch (error) {
      logError("errors.refreshMonthsFailed", error);
    }
  });
  generatePngButton.addEventListener("click", async () => {
    await generateForTarget("png");
  });
  generateXlsxButton.addEventListener("click", async () => {
    await generateForTarget("xlsx");
  });
}
async function refreshMonths() {
  if (!tsvFolderInput.value) {
    log(t("logs.setTsvFolderFirst"));
    return;
  }
  log(t("logs.refreshMonthsFor", { folder: tsvFolderInput.value }));
  const months = await window.appApi.listMonths(tsvFolderInput.value);
  const previousMonth = monthSelect.value;
  monthSelect.innerHTML = "";
  months.forEach((month) => {
    const option = document.createElement("option");
    option.value = month;
    option.textContent = month;
    monthSelect.appendChild(option);
  });
  if (months.length === 0) {
    log(t("logs.noMonthFilesFound"));
  } else {
    if (previousMonth && months.includes(previousMonth)) {
      monthSelect.value = previousMonth;
    }
    saveLastEntries();
    log(t("logs.foundMonths", { months: months.join(", ") }));
  }
}
function bindPersistence() {
  const save = () => saveLastEntries();
  tsvFolderInput.addEventListener("change", save);
  outputFolderInput.addEventListener("change", save);
  monthSelect.addEventListener("change", save);
  localeSelect.addEventListener("change", save);
  timeFormatSelect.addEventListener("change", () => {
    syncFajrLimitUi();
    syncZhuhrLimitUi();
    save();
  });
  baseGroupSizeSelect.addEventListener("change", save);
  ramazanHesabiInput.addEventListener("change", save);
  announcementMessageInput.addEventListener("change", save);
  announcementMessageInput.addEventListener("input", save);
  fajrLatestLimitEnabledInput.addEventListener("change", () => {
    syncFajrLimitUi();
    save();
  });
  zhuhrEarliestLimitEnabledInput.addEventListener("change", () => {
    syncZhuhrLimitUi();
    save();
  });
  zhuhrLimitModeSelect.addEventListener("change", () => {
    syncZhuhrLimitUi();
    save();
  });
}
function bindUiLanguageSwitch() {
  switchUiLanguageButton.addEventListener("click", async () => {
    const nextLanguage = getNextUiLanguage();
    await setUiLanguage(nextLanguage);
    localStorage.setItem(UI_LANGUAGE_STORAGE_KEY, nextLanguage);
    applyUiTranslations();
    syncFajrLimitUi();
    syncZhuhrLimitUi();
  });
}
function applyUiTranslations() {
  translateStaticDocumentText();
  const currentLanguage = getUiLanguage();
  switchUiLanguageButton.textContent = currentLanguage === "en" ? t("buttons.switchToTurkish") : t("buttons.switchToEnglish");
}
async function restoreLastEntries() {
  const saved = loadLastEntries();
  if (!saved) {
    applyFreshDefaults();
    syncFajrLimitUi();
    syncZhuhrLimitUi();
    await refreshMonths();
    return;
  }
  tsvFolderInput.value = saved.tsvFolder.trim() || DEFAULT_TSV_FOLDER;
  outputFolderInput.value = saved.outputFolder;
  localeSelect.value = saved.locale;
  timeFormatSelect.value = saved.timeFormat;
  baseGroupSizeSelect.value = saved.baseGroupSize;
  ramazanHesabiInput.checked = saved.ramazanHesabi;
  announcementMessageInput.value = saved.announcementMessage;
  fajrLatestLimitEnabledInput.checked = saved.fajrLatestLimitEnabled;
  fajrLatestLimitMinutesState = clampDayMinute(saved.fajrLatestLimitMinutes);
  zhuhrEarliestLimitEnabledInput.checked = saved.zhuhrEarliestLimitEnabled;
  zhuhrLimitModeSelect.value = saved.zhuhrUseStandardDaylightLimits ? "std-dst" : "single";
  zhuhrSingleLimitMinutesState = clampDayMinute(saved.zhuhrEarliestLimitMinutes);
  zhuhrStandardLimitMinutesState = clampDayMinute(saved.zhuhrStandardEarliestLimitMinutes);
  zhuhrDaylightLimitMinutesState = clampDayMinute(saved.zhuhrDaylightEarliestLimitMinutes);
  syncFajrLimitUi();
  syncZhuhrLimitUi();
  if (tsvFolderInput.value.trim()) {
    await refreshMonths();
    if (saved.month && Array.from(monthSelect.options).some((opt) => opt.value === saved.month)) {
      monthSelect.value = saved.month;
    }
    saveLastEntries();
  }
  log(t("logs.restoredLastEntries"));
}
function saveLastEntries() {
  const data = {
    tsvFolder: tsvFolderInput.value.trim(),
    outputFolder: outputFolderInput.value.trim(),
    month: monthSelect.value,
    locale: localeSelect.value,
    timeFormat: timeFormatSelect.value,
    baseGroupSize: baseGroupSizeSelect.value,
    ramazanHesabi: ramazanHesabiInput.checked,
    announcementMessage: announcementMessageInput.value,
    fajrLatestLimitEnabled: fajrLatestLimitEnabledInput.checked,
    fajrLatestLimitMinutes: fajrLatestLimitMinutesState,
    zhuhrEarliestLimitEnabled: zhuhrEarliestLimitEnabledInput.checked,
    zhuhrUseStandardDaylightLimits: zhuhrLimitModeSelect.value === "std-dst",
    zhuhrEarliestLimitMinutes: zhuhrSingleLimitMinutesState,
    zhuhrStandardEarliestLimitMinutes: zhuhrStandardLimitMinutesState,
    zhuhrDaylightEarliestLimitMinutes: zhuhrDaylightLimitMinutesState
  };
  localStorage.setItem(LAST_ENTRIES_KEY, JSON.stringify(data));
}
function loadLastEntries() {
  const raw = localStorage.getItem(LAST_ENTRIES_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    const normalizedTsvFolder = parsed.tsvFolder?.trim() || DEFAULT_TSV_FOLDER;
    return {
      tsvFolder: normalizedTsvFolder,
      outputFolder: parsed.outputFolder ?? "",
      month: parsed.month ?? "",
      locale: parsed.locale === "tr" ? "tr" : "en",
      timeFormat: parsed.timeFormat === "24h" ? "24h" : "ampm",
      baseGroupSize: parsed.baseGroupSize ?? "5",
      ramazanHesabi: parsed.ramazanHesabi !== false,
      announcementMessage: parsed.announcementMessage ?? "",
      fajrLatestLimitEnabled: parsed.fajrLatestLimitEnabled !== false,
      fajrLatestLimitMinutes: Number.isFinite(parsed.fajrLatestLimitMinutes) ? Number(parsed.fajrLatestLimitMinutes) : 390,
      zhuhrEarliestLimitEnabled: parsed.zhuhrEarliestLimitEnabled !== false,
      zhuhrUseStandardDaylightLimits: parsed.zhuhrUseStandardDaylightLimits === true,
      zhuhrEarliestLimitMinutes: Number.isFinite(parsed.zhuhrEarliestLimitMinutes) ? Number(parsed.zhuhrEarliestLimitMinutes) : 730,
      zhuhrStandardEarliestLimitMinutes: Number.isFinite(parsed.zhuhrStandardEarliestLimitMinutes) ? Number(parsed.zhuhrStandardEarliestLimitMinutes) : 750,
      zhuhrDaylightEarliestLimitMinutes: Number.isFinite(parsed.zhuhrDaylightEarliestLimitMinutes) ? Number(parsed.zhuhrDaylightEarliestLimitMinutes) : 810
    };
  } catch {
    return null;
  }
}
function readOptions() {
  return {
    month: monthSelect.value,
    tsvFolder: tsvFolderInput.value.trim(),
    outputFolder: outputFolderInput.value.trim(),
    announcementMessage: announcementMessageInput.value,
    fajrLatestLimitEnabled: fajrLatestLimitEnabledInput.checked,
    fajrLatestLimitMinutes: fajrLatestLimitMinutesState,
    zhuhrEarliestLimitEnabled: zhuhrEarliestLimitEnabledInput.checked,
    zhuhrUseStandardDaylightLimits: zhuhrLimitModeSelect.value === "std-dst",
    zhuhrEarliestLimitMinutes: zhuhrSingleLimitMinutesState,
    zhuhrStandardEarliestLimitMinutes: zhuhrStandardLimitMinutesState,
    zhuhrDaylightEarliestLimitMinutes: zhuhrDaylightLimitMinutesState,
    locale: localeSelect.value,
    timeFormat: timeFormatSelect.value,
    baseGroupSize: Number(baseGroupSizeSelect.value),
    includeFridayNotes: true,
    ramazanHesabi: ramazanHesabiInput.checked
  };
}
function applyFreshDefaults() {
  tsvFolderInput.value = DEFAULT_TSV_FOLDER;
  localeSelect.value = "en";
  timeFormatSelect.value = "ampm";
  baseGroupSizeSelect.value = "5";
  ramazanHesabiInput.checked = true;
  fajrLatestLimitEnabledInput.checked = true;
  fajrLatestLimitMinutesState = 390;
  zhuhrEarliestLimitEnabledInput.checked = true;
  zhuhrLimitModeSelect.value = "single";
  zhuhrSingleLimitMinutesState = 730;
  zhuhrStandardLimitMinutesState = 750;
  zhuhrDaylightLimitMinutesState = 810;
}
function validateBeforeGenerate(options2) {
  const errors2 = [];
  if (!options2.month) {
    errors2.push(t("validation.monthRequired"));
  }
  if (!options2.outputFolder.trim()) {
    errors2.push(t("validation.outputFolderRequired"));
  }
  if (!options2.tsvFolder.trim()) {
    errors2.push(t("validation.tsvFolderRequired"));
  }
  return errors2;
}
function setGenerateButtonsDisabled(disabled) {
  generatePngButton.disabled = disabled;
  generateXlsxButton.disabled = disabled;
}
async function generateForTarget(target) {
  if (isGenerating) {
    return;
  }
  const options2 = readOptions();
  const validationErrors = validateBeforeGenerate(options2);
  if (validationErrors.length > 0) {
    showStatus(t("status.validationFailed", { details: validationErrors.join(" ") }));
    return;
  }
  isGenerating = true;
  setGenerateButtonsDisabled(true);
  saveLastEntries();
  const targetLabel = target === "png" ? "PNG" : "XLSX";
  try {
    log(t("logs.generateClicked", { month: options2.month, target: targetLabel }));
    await window.appApi.generateOutputs({ options: options2, targets: [target] });
    if (target === "png") {
      showStatus("");
      return;
    }
    showStatus("");
  } catch (error) {
    const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    showStatus(t("status.generateFailed", { target: targetLabel, details }));
    logError("errors.generateFailed", error);
  } finally {
    isGenerating = false;
    setGenerateButtonsDisabled(false);
  }
}
function bindFajrLimitControls() {
  getEl("fajrHourInc").addEventListener("click", () => {
    incrementFajrHour(1);
    saveLastEntries();
  });
  getEl("fajrHourDec").addEventListener("click", () => {
    incrementFajrHour(-1);
    saveLastEntries();
  });
  getEl("fajrMinuteInc").addEventListener("click", () => {
    incrementFajrMinute(1);
    saveLastEntries();
  });
  getEl("fajrMinuteDec").addEventListener("click", () => {
    incrementFajrMinute(-1);
    saveLastEntries();
  });
  fajrHourInput.addEventListener("change", () => {
    applyManualFajrHour();
    saveLastEntries();
  });
  fajrMinuteInput.addEventListener("change", () => {
    applyManualFajrMinute();
    saveLastEntries();
  });
}
function syncFajrLimitUi() {
  const enabled = fajrLatestLimitEnabledInput.checked;
  const timeFormat = timeFormatSelect.value;
  const display = formatLimitForUi(fajrLatestLimitMinutesState, timeFormat);
  fajrHourInput.value = String(display.hour).padStart(2, "0");
  fajrMinuteInput.value = String(display.minute).padStart(2, "0");
  fajrAmPmLabel.textContent = display.suffix;
  fajrAmPmLabel.style.visibility = timeFormat === "24h" ? "hidden" : "visible";
  fajrHourInput.disabled = !enabled;
  fajrMinuteInput.disabled = !enabled;
  getEl("fajrHourInc").disabled = !enabled;
  getEl("fajrHourDec").disabled = !enabled;
  getEl("fajrMinuteInc").disabled = !enabled;
  getEl("fajrMinuteDec").disabled = !enabled;
}
function incrementFajrHour(step) {
  fajrLatestLimitMinutesState = clampDayMinute(fajrLatestLimitMinutesState + step * 60);
  syncFajrLimitUi();
}
function incrementFajrMinute(step) {
  fajrLatestLimitMinutesState = clampDayMinute(fajrLatestLimitMinutesState + step);
  syncFajrLimitUi();
}
function applyManualFajrHour() {
  const timeFormat = timeFormatSelect.value;
  const raw = Number(fajrHourInput.value);
  if (!Number.isFinite(raw)) {
    syncFajrLimitUi();
    return;
  }
  const hour = Math.trunc(raw);
  const currentMinute = fajrLatestLimitMinutesState % 60;
  if (timeFormat === "24h") {
    if (hour < 0 || hour > 23) {
      syncFajrLimitUi();
      return;
    }
    fajrLatestLimitMinutesState = hour * 60 + currentMinute;
    syncFajrLimitUi();
    return;
  }
  if (hour < 1 || hour > 12) {
    syncFajrLimitUi();
    return;
  }
  const currentHour24 = Math.floor(fajrLatestLimitMinutesState / 60);
  const isPm = currentHour24 >= 12;
  const hour24 = hour % 12 + (isPm ? 12 : 0);
  fajrLatestLimitMinutesState = hour24 * 60 + currentMinute;
  syncFajrLimitUi();
}
function applyManualFajrMinute() {
  const raw = Number(fajrMinuteInput.value);
  if (!Number.isFinite(raw)) {
    syncFajrLimitUi();
    return;
  }
  const minute = Math.trunc(raw);
  if (minute < 0 || minute > 59) {
    syncFajrLimitUi();
    return;
  }
  const hour24 = Math.floor(fajrLatestLimitMinutesState / 60);
  fajrLatestLimitMinutesState = hour24 * 60 + minute;
  syncFajrLimitUi();
}
function bindZhuhrLimitControls() {
  getEl("zhuhrSingleHourInc").addEventListener("click", () => {
    incrementZhuhrHour("single", 1);
    saveLastEntries();
  });
  getEl("zhuhrSingleHourDec").addEventListener("click", () => {
    incrementZhuhrHour("single", -1);
    saveLastEntries();
  });
  getEl("zhuhrSingleMinuteInc").addEventListener("click", () => {
    incrementZhuhrMinute("single", 1);
    saveLastEntries();
  });
  getEl("zhuhrSingleMinuteDec").addEventListener("click", () => {
    incrementZhuhrMinute("single", -1);
    saveLastEntries();
  });
  getEl("zhuhrStdHourInc").addEventListener("click", () => {
    incrementZhuhrHour("standard", 1);
    saveLastEntries();
  });
  getEl("zhuhrStdHourDec").addEventListener("click", () => {
    incrementZhuhrHour("standard", -1);
    saveLastEntries();
  });
  getEl("zhuhrStdMinuteInc").addEventListener("click", () => {
    incrementZhuhrMinute("standard", 1);
    saveLastEntries();
  });
  getEl("zhuhrStdMinuteDec").addEventListener("click", () => {
    incrementZhuhrMinute("standard", -1);
    saveLastEntries();
  });
  getEl("zhuhrDstHourInc").addEventListener("click", () => {
    incrementZhuhrHour("daylight", 1);
    saveLastEntries();
  });
  getEl("zhuhrDstHourDec").addEventListener("click", () => {
    incrementZhuhrHour("daylight", -1);
    saveLastEntries();
  });
  getEl("zhuhrDstMinuteInc").addEventListener("click", () => {
    incrementZhuhrMinute("daylight", 1);
    saveLastEntries();
  });
  getEl("zhuhrDstMinuteDec").addEventListener("click", () => {
    incrementZhuhrMinute("daylight", -1);
    saveLastEntries();
  });
  zhuhrSingleHourInput.addEventListener("change", () => {
    applyManualZhuhrHour("single", zhuhrSingleHourInput);
    saveLastEntries();
  });
  zhuhrSingleMinuteInput.addEventListener("change", () => {
    applyManualZhuhrMinute("single", zhuhrSingleMinuteInput);
    saveLastEntries();
  });
  zhuhrStdHourInput.addEventListener("change", () => {
    applyManualZhuhrHour("standard", zhuhrStdHourInput);
    saveLastEntries();
  });
  zhuhrStdMinuteInput.addEventListener("change", () => {
    applyManualZhuhrMinute("standard", zhuhrStdMinuteInput);
    saveLastEntries();
  });
  zhuhrDstHourInput.addEventListener("change", () => {
    applyManualZhuhrHour("daylight", zhuhrDstHourInput);
    saveLastEntries();
  });
  zhuhrDstMinuteInput.addEventListener("change", () => {
    applyManualZhuhrMinute("daylight", zhuhrDstMinuteInput);
    saveLastEntries();
  });
}
function syncZhuhrLimitUi() {
  const enabled = zhuhrEarliestLimitEnabledInput.checked;
  const useDualMode = zhuhrLimitModeSelect.value === "std-dst";
  const timeFormat = timeFormatSelect.value;
  const singleDisplay = formatLimitForUi(zhuhrSingleLimitMinutesState, timeFormat);
  zhuhrSingleHourInput.value = String(singleDisplay.hour).padStart(2, "0");
  zhuhrSingleMinuteInput.value = String(singleDisplay.minute).padStart(2, "0");
  zhuhrSingleAmPmLabel.textContent = singleDisplay.suffix;
  const standardDisplay = formatLimitForUi(zhuhrStandardLimitMinutesState, timeFormat);
  zhuhrStdHourInput.value = String(standardDisplay.hour).padStart(2, "0");
  zhuhrStdMinuteInput.value = String(standardDisplay.minute).padStart(2, "0");
  zhuhrStdAmPmLabel.textContent = standardDisplay.suffix;
  const daylightDisplay = formatLimitForUi(zhuhrDaylightLimitMinutesState, timeFormat);
  zhuhrDstHourInput.value = String(daylightDisplay.hour).padStart(2, "0");
  zhuhrDstMinuteInput.value = String(daylightDisplay.minute).padStart(2, "0");
  zhuhrDstAmPmLabel.textContent = daylightDisplay.suffix;
  const ampmVisibility = timeFormat === "24h" ? "hidden" : "visible";
  zhuhrSingleAmPmLabel.style.visibility = ampmVisibility;
  zhuhrStdAmPmLabel.style.visibility = ampmVisibility;
  zhuhrDstAmPmLabel.style.visibility = ampmVisibility;
  zhuhrSingleGroup.style.display = useDualMode ? "none" : "flex";
  zhuhrDualGroup.style.display = useDualMode ? "flex" : "none";
  zhuhrStdDstRow.style.display = useDualMode ? "grid" : "none";
  zhuhrLimitModeSelect.disabled = !enabled;
  setZhuhrGroupDisabled("single", !enabled || useDualMode);
  setZhuhrGroupDisabled("standard", !enabled || !useDualMode);
  setZhuhrGroupDisabled("daylight", !enabled || !useDualMode);
}
function setZhuhrGroupDisabled(group, disabled) {
  const prefix = group === "single" ? "zhuhrSingle" : group === "standard" ? "zhuhrStd" : "zhuhrDst";
  getEl(`${prefix}HourInc`).disabled = disabled;
  getEl(`${prefix}HourDec`).disabled = disabled;
  getEl(`${prefix}MinuteInc`).disabled = disabled;
  getEl(`${prefix}MinuteDec`).disabled = disabled;
  getEl(`${prefix}Hour`).disabled = disabled;
  getEl(`${prefix}Minute`).disabled = disabled;
}
function incrementZhuhrHour(group, step) {
  const current = getZhuhrLimitState(group);
  setZhuhrLimitState(group, clampDayMinute(current + step * 60));
  syncZhuhrLimitUi();
}
function incrementZhuhrMinute(group, step) {
  const current = getZhuhrLimitState(group);
  setZhuhrLimitState(group, clampDayMinute(current + step));
  syncZhuhrLimitUi();
}
function applyManualZhuhrHour(group, inputEl) {
  const timeFormat = timeFormatSelect.value;
  const raw = Number(inputEl.value);
  if (!Number.isFinite(raw)) {
    syncZhuhrLimitUi();
    return;
  }
  const hour = Math.trunc(raw);
  const currentMinute = getZhuhrLimitState(group) % 60;
  if (timeFormat === "24h") {
    if (hour < 0 || hour > 23) {
      syncZhuhrLimitUi();
      return;
    }
    setZhuhrLimitState(group, hour * 60 + currentMinute);
    syncZhuhrLimitUi();
    return;
  }
  if (hour < 1 || hour > 12) {
    syncZhuhrLimitUi();
    return;
  }
  const currentHour24 = Math.floor(getZhuhrLimitState(group) / 60);
  const isPm = currentHour24 >= 12;
  const hour24 = hour % 12 + (isPm ? 12 : 0);
  setZhuhrLimitState(group, hour24 * 60 + currentMinute);
  syncZhuhrLimitUi();
}
function applyManualZhuhrMinute(group, inputEl) {
  const raw = Number(inputEl.value);
  if (!Number.isFinite(raw)) {
    syncZhuhrLimitUi();
    return;
  }
  const minute = Math.trunc(raw);
  if (minute < 0 || minute > 59) {
    syncZhuhrLimitUi();
    return;
  }
  const hour24 = Math.floor(getZhuhrLimitState(group) / 60);
  setZhuhrLimitState(group, hour24 * 60 + minute);
  syncZhuhrLimitUi();
}
function getZhuhrLimitState(group) {
  if (group === "single") {
    return zhuhrSingleLimitMinutesState;
  }
  if (group === "standard") {
    return zhuhrStandardLimitMinutesState;
  }
  return zhuhrDaylightLimitMinutesState;
}
function setZhuhrLimitState(group, value) {
  if (group === "single") {
    zhuhrSingleLimitMinutesState = value;
    return;
  }
  if (group === "standard") {
    zhuhrStandardLimitMinutesState = value;
    return;
  }
  zhuhrDaylightLimitMinutesState = value;
}
function clampDayMinute(value) {
  return Math.max(0, Math.min(1439, Math.trunc(value)));
}
function formatLimitForUi(minutes, timeFormat) {
  const mm = clampDayMinute(minutes);
  const hour24 = Math.floor(mm / 60);
  const minute = mm % 60;
  if (timeFormat === "24h") {
    return { hour: hour24, minute, suffix: "" };
  }
  const suffix = hour24 < 12 ? t("time.am") : t("time.pm");
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour: hour12, minute, suffix };
}
function log(message) {
  console.log(`[renderer] ${message}`);
}
function showStatus(message) {
  statusMessageEl.textContent = message;
}
function logError(prefixKey, error) {
  const details = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  const prefix = t(prefixKey);
  console.error(`[renderer] ${prefix}`, error);
  showStatus(t("logs.errorWithDetails", { prefix, details }));
}
function getEl(id) {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Element not found: ${id}`);
  }
  return el;
}
