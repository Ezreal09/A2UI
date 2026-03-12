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

import {Suspense, memo, lazy, useSyncExternalStore, useCallback, type ComponentType} from 'react';
import type {SurfaceModel, ComponentModel, ChildList} from '../types';
import type {ReactComponentApi, ReactCatalog} from '../registry/ReactCatalog';
import type {A2UIComponentPropsV9} from '../types';

const LoadingFallback = memo(function LoadingFallback() {
  return (
    <div className="a2ui-loading" style={{padding: '8px', opacity: 0.5}}>
      Loading...
    </div>
  );
});

interface ComponentNodeV9Props {
  /** The component ID to render */
  componentId: string;
  /** The surface model this component belongs to */
  surface: SurfaceModel<ReactComponentApi>;
}

/**
 * ComponentNodeV9 - dynamically renders a v0.9 A2UI component by its ID.
 *
 * Key differences from v0.8 ComponentNode:
 * - Receives `componentId` + `surface` instead of a pre-resolved `node` object.
 * - Subscribes to `ComponentModel.onUpdated` via useSyncExternalStore so the
 *   component only re-renders when its OWN properties change.
 * - Resolves child component IDs from the `children` property and recursively
 *   renders them as ComponentNodeV9 instances.
 * - Supports both static child ID arrays and dynamic `{ componentId, path }` templates.
 */
export const ComponentNodeV9 = memo(function ComponentNodeV9({
  componentId,
  surface,
}: ComponentNodeV9Props) {
  // Subscribe to this component model's update events.
  // Re-renders only when this component's own properties change.
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const model = surface.componentsModel.get(componentId);
      if (!model) return () => {};
      const sub = model.onUpdated.subscribe(() => onStoreChange());
      return () => sub.unsubscribe();
    },
    [componentId, surface]
  );

  const getSnapshot = useCallback(
    () => surface.componentsModel.get(componentId),
    [componentId, surface]
  );

  const componentModel = useSyncExternalStore(subscribe, getSnapshot) as ComponentModel | undefined;

  if (!componentModel) {
    console.warn(`[A2UI v0.9] Component not found: ${componentId}`);
    return null;
  }

  const catalog = surface.catalog as ReactCatalog;
  const registration = catalog.getRegistration(componentModel.type);

  if (!registration) {
    console.warn(`[A2UI v0.9] Unknown component type: ${componentModel.type}`);
    return null;
  }

  const Component = resolveComponent(catalog, componentModel.type, registration.component);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component componentId={componentId} surface={surface} />
    </Suspense>
  );
});

/**
 * Renders a static or dynamic child list as ComponentNodeV9 instances.
 *
 * - If `children` is a string array, renders each ID directly.
 * - If `children` is a `{ componentId, path }` template, reads the array from
 *   the data model and renders one ComponentNodeV9 per item.
 *
 * Exported so that layout components (Row, Column, List, etc.)
 * can call it without duplicating child-resolution logic.
 */
export function renderChildren(
  children: ChildList | undefined,
  surface: SurfaceModel<ReactComponentApi>
): React.ReactNode {
  if (!children) return null;

  // Static list: string[]
  if (Array.isArray(children)) {
    return children.map((id) => <ComponentNodeV9 key={id} componentId={id} surface={surface} />);
  }

  // Dynamic template: { componentId, path }
  if ('componentId' in children && 'path' in children) {
    return (
      <DynamicChildList
        templateComponentId={children.componentId}
        dataPath={children.path}
        surface={surface}
      />
    );
  }

  return null;
}

/**
 * Renders a dynamic list of children driven by a data model array.
 * Subscribes to the data path's Preact Signal and re-renders when the array changes.
 */
function DynamicChildList({
  templateComponentId,
  dataPath,
  surface,
}: {
  templateComponentId: string;
  dataPath: string;
  surface: SurfaceModel<ReactComponentApi>;
}) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // Use DataModel.subscribe which is the stable backwards-compatible API.
      // It wraps a Preact Signal internally and calls onChange whenever the value changes.
      const sub = surface.dataModel.subscribe<unknown[]>(dataPath, () => onStoreChange());
      return () => sub.unsubscribe();
    },
    [surface, dataPath]
  );

  const getSnapshot = useCallback(() => surface.dataModel.get(dataPath), [surface, dataPath]);

  const items = useSyncExternalStore(subscribe, getSnapshot) as unknown[] | undefined;

  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return (
    <>
      {items.map((_, index) => (
        <ComponentNodeV9
          key={`${templateComponentId}-${index}`}
          componentId={templateComponentId}
          surface={surface}
        />
      ))}
    </>
  );
}

// Cache for lazy-loaded components to prevent re-creating them on each render
const lazyComponentCache = new Map<string, ComponentType<A2UIComponentPropsV9>>();

type ComponentOrLoader =
  | ComponentType<A2UIComponentPropsV9>
  | (() => Promise<{default: ComponentType<A2UIComponentPropsV9>}>);

function resolveComponent(
  catalog: ReactCatalog,
  typeName: string,
  component: ComponentOrLoader
): ComponentType<A2UIComponentPropsV9> {
  const registration = catalog.getRegistration(typeName);
  if (!registration) return component as ComponentType<A2UIComponentPropsV9>;

  if (registration.lazy && typeof component === 'function') {
    const cached = lazyComponentCache.get(typeName);
    if (cached) return cached;
    const lazyComponent = lazy(
      component as () => Promise<{default: ComponentType<A2UIComponentPropsV9>}>
    );
    lazyComponentCache.set(typeName, lazyComponent);
    return lazyComponent;
  }

  return component as ComponentType<A2UIComponentPropsV9>;
}

export default ComponentNodeV9;
