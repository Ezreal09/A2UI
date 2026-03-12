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

import {z} from 'zod';
import {
  Catalog,
  type ComponentApi,
  type FunctionImplementation,
  BASIC_FUNCTIONS,
} from '@a2ui/web_core/v0_9';
import type {ComponentType} from 'react';
import type {A2UIComponentPropsV9} from '../types';

export type {FunctionImplementation};

/**
 * The concrete ComponentApi implementation for the React renderer.
 *
 * v0.9 requires a typed ComponentApi to be passed to the Catalog and
 * MessageProcessor. For React, the relevant metadata is:
 * - `name`: the component type string (e.g. "Button", "Text")
 * - `schema`: the Zod schema for validating properties
 */
export class ReactComponentApi implements ComponentApi {
  constructor(
    readonly name: string,
    readonly schema: z.ZodType<any> = z.object({}).passthrough()
  ) {}
}

/**
 * A function that loads a v0.9 React component asynchronously.
 */
export type ComponentLoaderV9 = () => Promise<{
  default: ComponentType<A2UIComponentPropsV9>;
}>;

/**
 * Registration entry for a v0.9 component.
 */
export interface ComponentRegistrationV9 {
  /** The React component or a loader function for lazy loading */
  component: ComponentType<A2UIComponentPropsV9> | ComponentLoaderV9;
  /** If true, the component will be lazy loaded */
  lazy?: boolean;
  /** The Zod schema for this component's properties (optional) */
  schema?: z.ZodType<any>;
}

/**
 * A catalog implementation for the React renderer that acts as a bridge between
 * the v0.9 MessageProcessor and the React component registry.
 *
 * Usage:
 * ```ts
 * const catalog = new ReactCatalog('my-catalog');
 * catalog.register('Button', { component: Button });
 * catalog.register('Text', { component: Text });
 *
 * // Then pass to A2UIProviderV9
 * <A2UIProviderV9 catalogs={[catalog]} onAction={handleAction}>
 *   <A2UIRendererV9 surfaceId="main" />
 * </A2UIProviderV9>
 * ```
 */
export class ReactCatalog extends Catalog<ReactComponentApi> {
  private componentRegistry = new Map<string, ComponentRegistrationV9>();

  /**
   * Creates a new ReactCatalog.
   *
   * @param id The unique identifier for this catalog (must match the `catalogId` in `createSurface` messages).
   * @param functions Optional map of catalog functions (e.g. BASIC_FUNCTIONS) available for DynamicValue resolution.
   */
  constructor(id: string, functions?: Record<string, FunctionImplementation>) {
    // Initialize with empty components - they will be added via register()
    super(id, [], functions);
  }

  /**
   * Registers a React component for a given A2UI component type name.
   *
   * @param typeName The A2UI component type (e.g. 'Button', 'Text')
   * @param registration The component registration entry
   */
  register(typeName: string, registration: ComponentRegistrationV9): void {
    const api = new ReactComponentApi(typeName, registration.schema);
    // Mutate the underlying components map - needed since Catalog makes it readonly
    (this.components as Map<string, ReactComponentApi>).set(typeName, api);
    this.componentRegistry.set(typeName, registration);
  }

  /**
   * Gets the React component registration for a given type name.
   *
   * @param typeName The A2UI component type
   * @returns The registration, or undefined if not found
   */
  getRegistration(typeName: string): ComponentRegistrationV9 | undefined {
    return this.componentRegistry.get(typeName);
  }

  /**
   * Checks if a component type is registered.
   *
   * @param typeName The A2UI component type
   */
  hasComponent(typeName: string): boolean {
    return this.componentRegistry.has(typeName);
  }
}

/**
 * Creates a ReactCatalog pre-loaded with all BASIC_FUNCTIONS from the v0.9 basic catalog.
 * Use this instead of `new ReactCatalog(id)` when you want built-in support for
 * formatString, formatDate, required, regex, and other standard functions.
 *
 * @param id The catalog ID (must match the `catalogId` in `createSurface` messages)
 * @returns A ReactCatalog with BASIC_FUNCTIONS registered
 *
 * @example
 * ```ts
 * const catalog = createDefaultReactCatalog('my-catalog');
 * catalog.register('Text', { component: TextComponent });
 * ```
 */
export function createDefaultReactCatalog(id: string): ReactCatalog {
  return new ReactCatalog(id, BASIC_FUNCTIONS);
}
