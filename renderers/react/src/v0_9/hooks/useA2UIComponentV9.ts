/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {useCallback, useEffect, useId, useMemo, useState, useSyncExternalStore} from 'react';
import type {
  SurfaceModel,
  DynamicString,
  DynamicNumber,
  DynamicBoolean,
  Action,
  CheckRule,
} from '../types';
import type {ReactComponentApi} from '../registry/ReactCatalog';
import {DataContext, type FunctionInvoker} from '@a2ui/web_core/v0_9';

/**
 * Result returned by the useA2UIComponentV9 hook.
 */
export interface UseA2UIComponentV9Result {
  /**
   * Resolve a DynamicString to its current string value.
   *
   * For literal strings, returns the value directly.
   * For data bindings `{ path }`, reads from the data model synchronously.
   * The component will re-render when the bound data changes because
   * ComponentNodeV9 subscribes to ComponentModel.onUpdated events.
   */
  resolveString: (value: DynamicString | null | undefined) => string | null;

  /** Resolve a DynamicNumber to its current number value. */
  resolveNumber: (value: DynamicNumber | null | undefined) => number | null;

  /** Resolve a DynamicBoolean to its current boolean value. */
  resolveBoolean: (value: DynamicBoolean | null | undefined) => boolean | null;

  /**
   * Set a value in the surface's data model at the given path.
   * Used for two-way data binding (e.g. text field input).
   */
  setValue: (path: string, value: unknown) => void;

  /** Get the current value from the surface's data model at the given path. */
  getValue: (path: string) => unknown;

  /**
   * Dispatch a user action to the server.
   * Resolves all context bindings before dispatching.
   */
  sendAction: (action: Action) => void;

  /** Generate a unique ID for accessibility purposes. */
  getUniqueId: (prefix: string) => string;

  /**
   * The DataContext scoped to this component's data path.
   * Can be used directly for advanced data binding scenarios.
   */
  dataContext: DataContext;

  /**
   * The list of error messages from failed `checks` rules.
   * Empty when all checks pass or when no checks are defined.
   * Note: Populated only when `evaluateChecks` is called with a checks array.
   * Components should use `evaluateChecks(model?.checks)` directly and derive
   * checkErrors / isDisabled from the result.
   */
  checkErrors: string[];

  /**
   * Whether any check rule has failed.
   * Useful for disabling a Button when validation has not passed.
   * Derived from `checkErrors.length > 0`.
   */
  isDisabled: boolean;

  /**
   * Evaluates a list of check rules against the current data context.
   * Returns the error messages of all rules that failed (resolved to false).
   */
  evaluateChecks: (checks: CheckRule[] | undefined) => string[];
}

/** Build an absolute path from a base path and a potentially-relative path. */
function toAbsolutePath(path: string, basePath: string): string {
  if (path.startsWith('/')) return path;
  const base = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${base}${path}`;
}

/**
 * Subscribes to a data path using useSyncExternalStore.
 * Must be called at the top-level of a hook or component (React Hook rules).
 *
 * Exported so layout components can directly subscribe to specific paths.
 */
export function useDataPath(
  surface: SurfaceModel<ReactComponentApi>,
  absolutePath: string
): unknown {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const sub = surface.dataModel.subscribe(absolutePath, () => onStoreChange());
      return () => sub.unsubscribe();
    },
    [surface.dataModel, absolutePath]
  );
  const getSnapshot = useCallback(
    () => surface.dataModel.get(absolutePath),
    [surface.dataModel, absolutePath]
  );
  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * Evaluates a list of CheckRule objects reactively against the surface's DataModel.
 *
 * Re-evaluates automatically whenever any value in the DataModel changes.
 * Use this in Button-like components that need to enable/disable based on form state.
 *
 * @param checks - The CheckRule array from the component's properties.
 * @param surface - The surface model this component belongs to.
 * @param dataContext - The DataContext used to resolve dynamic values.
 * @returns `{ errors: string[], isDisabled: boolean }`
 */
export function useChecks(
  checks: CheckRule[] | undefined,
  surface: SurfaceModel<ReactComponentApi>,
  dataContext: DataContext
): {errors: string[]; isDisabled: boolean} {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (!checks || checks.length === 0) return;
    const sub = surface.dataModel.subscribe('/', () => {
      forceUpdate((n) => n + 1);
    });
    return () => sub.unsubscribe();
  }, [checks, surface.dataModel]);

  if (!checks || checks.length === 0) return {errors: [], isDisabled: false};

  const errors: string[] = [];
  for (const rule of checks) {
    const {message, ...condition} = rule as CheckRule & {message: string};
    try {
      const result = dataContext.resolveDynamicValue<boolean>(condition as never);
      if (result === false) errors.push(message);
    } catch {
      errors.push(message);
    }
  }
  return {errors, isDisabled: errors.length > 0};
}

/**
 * Base hook for v0.9 A2UI components.
 *
 * Architecture notes on reactivity:
 * - `resolveString/Number/Boolean` perform synchronous reads from the DataModel.
 *   They do NOT set up individual Signal subscriptions internally.
 * - Re-renders are triggered by `ComponentNodeV9` which subscribes to
 *   `ComponentModel.onUpdated` events. When `MessageProcessor.processMessages()`
 *   receives an `updateComponents` message, it sets `existing.properties = properties`
 *   which fires `ComponentModel.onUpdated`, which re-renders the component.
 * - For fine-grained data path subscriptions (e.g. in interactive components
 *   that need to react to data changes without a full component update), use
 *   the exported `useDataPath` hook directly.
 *
 * @param componentId - The component's unique ID within the surface
 * @param surface - The surface model this component belongs to
 * @param dataContextPath - Optional data path for scoping (e.g. for list items)
 *
 * @example
 * ```tsx
 * function TextComponent({ componentId, surface }: A2UIComponentPropsV9) {
 *   const { resolveString } = useA2UIComponentV9(componentId, surface);
 *   const model = surface.componentsModel.get(componentId);
 *   const text = resolveString(model?.properties.text);
 *   return <span>{text}</span>;
 * }
 * ```
 */
export function useA2UIComponentV9(
  componentId: string,
  surface: SurfaceModel<ReactComponentApi>,
  dataContextPath = '/'
): UseA2UIComponentV9Result {
  const baseId = useId();

  // Build a functionInvoker from the catalog's registered functions (if any)
  const functionInvoker = useMemo<FunctionInvoker | undefined>(() => {
    const catalog = surface.catalog;
    if (!catalog.functions || catalog.functions.size === 0) return undefined;
    return (name, args, ctx, abortSignal) => {
      const fn = catalog.functions?.get(name);
      if (!fn) throw new Error(`Function '${name}' not found in catalog '${catalog.id}'.`);
      return fn(args, ctx, abortSignal);
    };
  }, [surface.catalog]);

  // DataContext is a lightweight wrapper - safe to create per component instance.
  const dataContext = useMemo(
    () => new DataContext(surface.dataModel, dataContextPath, functionInvoker),
    [surface.dataModel, dataContextPath, functionInvoker]
  );

  const resolveString = useCallback(
    (value: DynamicString | null | undefined): string | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'string') return value;
      if (typeof value === 'object' && 'path' in value) {
        const absolutePath = toAbsolutePath(value.path, dataContextPath);
        const data = surface.dataModel.get(absolutePath);
        return data !== null && data !== undefined ? String(data) : null;
      }
      if (typeof value === 'object' && 'call' in value) {
        const result = dataContext.resolveDynamicValue<string>(value);
        return result !== null && result !== undefined ? String(result) : null;
      }
      return null;
    },
    [dataContext, dataContextPath, surface.dataModel]
  );

  const resolveNumber = useCallback(
    (value: DynamicNumber | null | undefined): number | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return value;
      if (typeof value === 'object' && 'path' in value) {
        const absolutePath = toAbsolutePath(value.path, dataContextPath);
        const data = surface.dataModel.get(absolutePath);
        return data !== null && data !== undefined ? Number(data) : null;
      }
      if (typeof value === 'object' && 'call' in value) {
        const result = dataContext.resolveDynamicValue<number>(value);
        return result !== null && result !== undefined ? Number(result) : null;
      }
      return null;
    },
    [dataContext, dataContextPath, surface.dataModel]
  );

  const resolveBoolean = useCallback(
    (value: DynamicBoolean | null | undefined): boolean | null => {
      if (value === null || value === undefined) return null;
      if (typeof value === 'boolean') return value;
      if (typeof value === 'object' && 'path' in value) {
        const absolutePath = toAbsolutePath((value as {path: string}).path, dataContextPath);
        const data = surface.dataModel.get(absolutePath);
        return data !== null && data !== undefined ? Boolean(data) : null;
      }
      if (typeof value === 'object') {
        const result = dataContext.resolveDynamicValue<boolean>(value as never);
        return result !== null && result !== undefined ? Boolean(result) : null;
      }
      return null;
    },
    [dataContext, dataContextPath, surface.dataModel]
  );

  const setValue = useCallback(
    (path: string, value: unknown) => {
      dataContext.set(path, value);
    },
    [dataContext]
  );

  const getValue = useCallback(
    (path: string): unknown => {
      const absolutePath = toAbsolutePath(path, dataContextPath);
      return surface.dataModel.get(absolutePath);
    },
    [dataContextPath, surface.dataModel]
  );

  const sendAction = useCallback(
    (action: Action) => {
      if ('event' in action) {
        const event = action.event;
        const resolvedContext: Record<string, unknown> = {};

        if (event.context) {
          for (const [key, dynValue] of Object.entries(event.context)) {
            resolvedContext[key] = dataContext.resolveDynamicValue(dynValue);
          }
        }

        // Per v0.9 spec: if sendDataModel is true, attach the full data model
        // snapshot to every dispatched user action.
        const dataModel = surface.sendDataModel ? surface.dataModel.get('/') : undefined;

        void surface.dispatchAction({
          userAction: {
            name: event.name,
            sourceComponentId: componentId,
            context: resolvedContext,
            timestamp: new Date().toISOString(),
            ...(dataModel !== undefined ? {dataModel} : {}),
          },
        });
      } else if ('functionCall' in action) {
        dataContext.resolveDynamicValue(action.functionCall);
      }
    },
    [componentId, surface, dataContext]
  );

  const getUniqueId = useCallback((prefix: string) => `${prefix}${baseId}`, [baseId]);

  // Evaluates a list of CheckRule objects against the current dataContext.
  // Each CheckRule is a LogicExpression intersected with { message: string }.
  // We extract the condition by omitting `message` and resolve it as a boolean.
  const evaluateChecks = useCallback(
    (checks: CheckRule[] | undefined): string[] => {
      if (!checks || checks.length === 0) return [];
      const errors: string[] = [];
      for (const rule of checks) {
        const {message, ...condition} = rule as CheckRule & {message: string};
        try {
          const result = dataContext.resolveDynamicValue<boolean>(condition as never);
          if (result === false) {
            errors.push(message);
          }
        } catch {
          errors.push(message);
        }
      }
      return errors;
    },
    [dataContext]
  );

  return useMemo(
    () => ({
      resolveString,
      resolveNumber,
      resolveBoolean,
      setValue,
      getValue,
      sendAction,
      getUniqueId,
      dataContext,
      evaluateChecks,
      checkErrors: [] as string[],
      isDisabled: false,
    }),
    [
      resolveString,
      resolveNumber,
      resolveBoolean,
      setValue,
      getValue,
      sendAction,
      getUniqueId,
      dataContext,
      evaluateChecks,
    ]
  );
}
