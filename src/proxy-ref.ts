export interface ProxyReference {
  [key: string]: any;
}

export interface Extender<_Extension extends ProxyReference> {
  get<T extends object>(target: T, name: string, proxy: T): any;
}

export interface FunctionCook {
  <T extends object>(value: Function, target: T, proxy: T): Function;
}

export function defaultCookFunction<T extends object>(
  value: Function,
  target: T,
): Function {
  return value.bind(target);
}

function cook<T extends object>(
  value: any,
  cookFunction: FunctionCook,
  target: T,
  proxy: T,
) {
  return typeof value === 'function'
    ? cookFunction(value, target, proxy)
    : value;
}

function prioritizeProxy<P extends ProxyReference, T extends object>(
  name: string,
  refs: P[],
  target: T,
  cookFunction: FunctionCook,
  proxy: T,
) {
  for (let i = 0; i < refs.length; i++) {
    const proxyReference = refs[i];
    if (name in proxyReference) {
      return cook(proxyReference[name], cookFunction, target, proxy);
    }
  }
  return cook(target[name as keyof T], cookFunction, target, proxy);
}

function prioritizeTarget<P extends ProxyReference, T extends object>(
  name: string,
  refs: P[],
  target: T,
  cookFunction: FunctionCook,
  proxy: T,
) {
  if (name in target) {
    return cook(target[name as keyof T], cookFunction, target, proxy);
  }
  for (let i = 0; i < refs.length; i++) {
    const proxyReference = refs[i];
    if (name in proxyReference) {
      return cook(proxyReference[name], cookFunction, target, proxy);
    }
  }
  return undefined;
}

export type PriorityOptions = 'extender' | 'object';

/**
 * Returns an instance of Extender<P> to be used to extend objects
 * @typeparam P Type of the ProxyReference
 * @param proxyReference The ProxyReference from where the extension method will be retrieved
 * @param cookFunction a function to prepare functions to be returned. By default, all functions returns bound with target
 * @param priority defines wether object will have priority in method choosing: target object (default) or the extender
 */
function getExtender<A extends P[], P extends ProxyReference>(
  proxyReference: A,
  cookFunction?: FunctionCook,
  priority?: PriorityOptions,
): Extender<P>;
/**
 * Returns an instance of Extender<P> to be used to extend objects
 * @typeparam P Type of the ProxyReference
 * @param proxyReference The ProxyReference from where the extension method will be retrieved
 * @param cookFunction a function to prepare functions to be returned. By default, all functions returns bound with target
 * @param priority defines wether object will have priority in method choosing: target object (default) or the extender
 */
function getExtender<P extends ProxyReference>(
  proxyReference: P,
  cookFunction?: FunctionCook,
  priority?: PriorityOptions,
): Extender<P>;
/**
 * Returns an instance of Extender<P> to be used to extend objects
 * @typeparam P Type of the ProxyReference
 * @param proxyReference The ProxyReference from where the extension method will be retrieved
 * @param cookFunction a function to prepare functions to be returned. By default, all functions returns bound with target
 * @param priority defines wether object will have priority in method choosing: target object (default) or the extender
 */
function getExtender<P1 extends ProxyReference, P2 extends ProxyReference>(
  proxyReference: [P1, P2],
  cookFunction?: FunctionCook,
  priority?: PriorityOptions,
): Extender<{
  [k in keyof P1 | keyof P2]: k extends keyof P1
    ? P1[k]
    : k extends keyof P2
      ? P2[k]
      : never;
}>;
function getExtender<P extends ProxyReference>(
  proxyReference: P | P[],
  cookFunction: FunctionCook = defaultCookFunction,
  priority: PriorityOptions = 'object',
): Extender<P> {
  const refs = Array.isArray(proxyReference)
    ? proxyReference
    : [proxyReference];
  return {
    get:
      priority === 'object'
        ? <T extends object>(target: T, name: string, proxy: T) =>
            prioritizeTarget(name, refs, target, cookFunction, proxy)
        : <T extends object>(target: T, name: string, proxy: T) =>
            prioritizeProxy(name, refs, target, cookFunction, proxy),
  };
}

export type ExtendedObject<RealObject, Extension> = Extension & RealObject;

/**
 * @typeparam RealObject the type of the object referenced
 * @typeparam Extension the type of Extender
 * @param obj the object to be extended
 * @param extender the Extender instance
 */
function extend<RealObject extends object, Extension extends object>(
  obj: RealObject,
  extender: Extender<Extension>,
): ExtendedObject<RealObject, Extension> {
  return new Proxy(obj, extender as object) as ExtendedObject<
    RealObject,
    Extension
  >;
}

type ClassRef<T extends object> = new (...args: any[]) => T;

function extendClass<
  T extends object,
  ClassType extends ClassRef<T>,
  Extension extends object,
>(classRef: ClassType, extender: Extender<Extension>): ClassType {
  return new Proxy(classRef, {
    construct(target: any, argArray: any) {
      return extend(new target(...argArray), extender);
    },
  });
}

export { extend, extendClass, getExtender };
