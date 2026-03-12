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

'use client';

import React, {useId, useMemo, useEffect, useRef} from 'react';
import type * as Types from '@a2ui/web_core/types/types';
import {A2UIProvider, useA2UIActions} from './A2UIProvider';
import {A2UIRenderer} from './A2UIRenderer';
import {litTheme} from '../theme/litTheme';
import type {OnActionCallback} from '../types';
import {A2UIProviderV9, useA2UIActionsV9} from '../v0_9/core/A2UIProviderV9';
import {A2UIRendererV9} from '../v0_9/core/A2UIRendererV9';
import {ReactCatalog} from '../v0_9/registry/ReactCatalog';
import type {A2uiMessage} from '@a2ui/web_core/v0_9';

/**
 * Component instance format for static A2UI definitions.
 */
export interface ComponentInstance {
  id: string;
  component: Record<string, unknown>;
}

/**
 * Action event dispatched when a user interacts with a component.
 */
export interface A2UIActionEvent {
  actionName: string;
  sourceComponentId: string;
  timestamp: string;
  context: Record<string, unknown>;
}

export interface A2UIViewerProps {
  /** The root component ID */
  root: string;
  /** Array of component definitions */
  components: ComponentInstance[];
  /** Data model for the surface */
  data?: Record<string, unknown>;
  /** Callback when an action is triggered */
  onAction?: (action: A2UIActionEvent) => void;
  /** Custom theme (defaults to litTheme) */
  theme?: Types.Theme;
  /** Additional CSS class */
  className?: string;
  /**
   * Protocol version to use.
   * - 'v0.8' (default): Uses the v0.8 message format (beginRendering/surfaceUpdate).
   * - 'v0.9': Uses the v0.9 message format (createSurface/updateComponents).
   *   Requires providing a `catalog` prop.
   */
  version?: 'v0.8' | 'v0.9';
  /**
   * The ReactCatalog to use when version='v0.9'.
   * If not provided, a default empty catalog named 'default' will be used.
   */
  catalog?: ReactCatalog;
}

/**
 * A2UIViewer renders an A2UI component tree from static JSON definitions.
 *
 * Use this when you have component definitions and data as props rather than
 * streaming messages from a server. For streaming use cases, use A2UIProvider
 * with A2UIRenderer and useA2UI instead.
 *
 * @example
 * ```tsx
 * const components = [
 *   { id: 'root', component: { Card: { child: 'text' } } },
 *   { id: 'text', component: { Text: { text: { path: '/message' } } } },
 * ];
 *
 * <A2UIViewer
 *   root="root"
 *   components={components}
 *   data={{ message: 'Hello World!' }}
 *   onAction={(action) => console.log('Action:', action)}
 * />
 * ```
 */
export function A2UIViewer({
  root,
  components,
  data = {},
  onAction,
  theme = litTheme,
  className,
  version = 'v0.8',
  catalog,
}: A2UIViewerProps) {
  // v0.9 branch - delegates to A2UIViewerV9 which handles its own hooks
  if (version === 'v0.9') {
    return (
      <A2UIViewerV9
        root={root}
        components={components}
        data={data}
        onAction={onAction}
        className={className}
        catalog={catalog}
      />
    );
  }

  // v0.8 branch - delegates to A2UIViewerV8 which handles its own hooks
  return (
    <A2UIViewerV8
      root={root}
      components={components}
      data={data}
      onAction={onAction}
      theme={theme}
      className={className}
    />
  );
}

/**
 * Internal v0.8 viewer implementation.
 */
function A2UIViewerV8({
  root,
  components,
  data = {},
  onAction,
  theme = litTheme,
  className,
}: Omit<A2UIViewerProps, 'version' | 'catalog'>) {
  const baseId = useId();
  const surfaceId = useMemo(() => {
    const definitionKey = `${root}-${JSON.stringify(components)}`;
    let hash = 0;
    for (let i = 0; i < definitionKey.length; i++) {
      hash = 31 * hash + definitionKey.charCodeAt(i);
    }
    return `surface${baseId.replace(/:/g, '-')}${hash}`;
  }, [baseId, root, components]);

  // Convert onAction callback to internal format
  const handleAction: OnActionCallback | undefined = useMemo(() => {
    if (!onAction) return undefined;

    return (message: Types.A2UIClientEventMessage) => {
      const userAction = message.userAction;
      if (userAction) {
        onAction({
          actionName: userAction.name,
          sourceComponentId: userAction.sourceComponentId,
          timestamp: userAction.timestamp,
          context: userAction.context ?? {},
        });
      }
    };
  }, [onAction]);

  return (
    <A2UIProvider onAction={handleAction} theme={theme}>
      <A2UIViewerInner
        surfaceId={surfaceId}
        root={root}
        components={components}
        data={data}
        className={className}
      />
    </A2UIProvider>
  );
}

/**
 * Inner component that processes messages within the provider context.
 */
function A2UIViewerInner({
  surfaceId,
  root,
  components,
  data,
  className,
}: {
  surfaceId: string;
  root: string;
  components: ComponentInstance[];
  data: Record<string, unknown>;
  className?: string;
}) {
  const {processMessages} = useA2UIActions();
  const lastProcessedRef = useRef<string>('');

  // Process messages when props change
  useEffect(() => {
    const key = `${surfaceId}-${JSON.stringify(components)}-${JSON.stringify(data)}`;
    if (key === lastProcessedRef.current) return;
    lastProcessedRef.current = key;

    const messages: Types.ServerToClientMessage[] = [
      {beginRendering: {surfaceId, root, styles: {}}},
      {surfaceUpdate: {surfaceId, components}},
    ];

    // Add data model updates
    if (data && Object.keys(data).length > 0) {
      const contents = objectToValueMaps(data);
      if (contents.length > 0) {
        messages.push({
          dataModelUpdate: {surfaceId, path: '/', contents},
        });
      }
    }

    processMessages(messages);
  }, [processMessages, surfaceId, root, components, data]);

  return (
    <div className={className}>
      <A2UIRenderer surfaceId={surfaceId} />
    </div>
  );
}

/**
 * Internal v0.9 viewer implementation.
 */
function A2UIViewerV9({
  root,
  components,
  data = {},
  onAction,
  className,
  catalog,
}: Omit<A2UIViewerProps, 'version' | 'theme'>) {
  const baseId = useId();
  const surfaceId = useMemo(() => `surface-v9-${baseId.replace(/:/g, '-')}`, [baseId]);
  const effectiveCatalog = useMemo(
    () => catalog ?? new ReactCatalog('default'),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [catalog?.id ?? 'default']
  );

  return (
    <A2UIProviderV9 catalogs={[effectiveCatalog]} onAction={onAction}>
      <A2UIViewerV9Inner
        surfaceId={surfaceId}
        catalogId={effectiveCatalog.id}
        root={root}
        components={components}
        data={data}
        className={className}
      />
    </A2UIProviderV9>
  );
}

/**
 * Inner component that sends v0.9 messages within the provider context.
 */
function A2UIViewerV9Inner({
  surfaceId,
  catalogId,
  root: _root,
  components,
  data,
  className,
}: {
  surfaceId: string;
  catalogId: string;
  root: string;
  components: ComponentInstance[];
  data: Record<string, unknown>;
  className?: string;
}) {
  const {processMessages} = useA2UIActionsV9();
  const lastProcessedRef = useRef<string>('');

  useEffect(() => {
    const key = `${surfaceId}-${JSON.stringify(components)}-${JSON.stringify(data)}`;
    if (key === lastProcessedRef.current) return;
    lastProcessedRef.current = key;

    const messages: A2uiMessage[] = [
      {
        version: 'v0.9',
        createSurface: {surfaceId, catalogId},
      },
      {
        version: 'v0.9',
        updateComponents: {
          surfaceId,
          components: components.map(({id, component}) => ({
            id,
            ...flattenComponent(component),
          })) as {component: string; id?: string; [key: string]: unknown}[],
        },
      },
    ];

    // Add data model update if data is non-empty
    if (data && Object.keys(data).length > 0) {
      messages.push({
        version: 'v0.9',
        updateDataModel: {surfaceId, path: '/', value: data},
      });
    }

    processMessages(messages);
  }, [processMessages, surfaceId, catalogId, components, data]);

  return (
    <div className={className}>
      <A2UIRendererV9 surfaceId={surfaceId} />
    </div>
  );
}

/**
 * Flattens a component definition from A2UIViewer's { TypeName: props } format
 * into v0.9's { component: 'TypeName', ...props } format.
 *
 * Input:  { Card: { child: 'text' } }
 * Output: { component: 'Card', child: 'text' }
 *
 * If already flat (no single-key object wrapping), returns as-is with no component field added.
 */
function flattenComponent(componentDef: Record<string, unknown>): Record<string, unknown> {
  const keys = Object.keys(componentDef);
  // v0.8-style: single key whose value is an object → unwrap
  const firstKey = keys[0];
  if (
    keys.length === 1 &&
    firstKey !== undefined &&
    typeof componentDef[firstKey] === 'object' &&
    componentDef[firstKey] !== null &&
    !Array.isArray(componentDef[firstKey])
  ) {
    const typeName = firstKey;
    const props = componentDef[typeName] as Record<string, unknown>;
    return {component: typeName, ...props};
  }
  // Already flat format (contains 'component' key) or unknown → return as-is
  return componentDef;
}

/**
 * Converts a nested JavaScript object to the ValueMap[] format
 * expected by A2UI's dataModelUpdate message.
 */
function objectToValueMaps(obj: Record<string, unknown>): Types.ValueMap[] {
  return Object.entries(obj).map(([key, value]) => valueToValueMap(key, value));
}

/**
 * Converts a single key-value pair to a ValueMap.
 */
function valueToValueMap(key: string, value: unknown): Types.ValueMap {
  if (typeof value === 'string') {
    return {key, valueString: value};
  }
  if (typeof value === 'number') {
    return {key, valueNumber: value};
  }
  if (typeof value === 'boolean') {
    return {key, valueBoolean: value};
  }
  if (value === null || value === undefined) {
    return {key};
  }
  if (Array.isArray(value)) {
    const valueMap = value.map((item, index) => valueToValueMap(String(index), item));
    return {key, valueMap};
  }
  if (typeof value === 'object') {
    const valueMap = objectToValueMaps(value as Record<string, unknown>);
    return {key, valueMap};
  }
  return {key};
}

export default A2UIViewer;
