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

import {createContext, useContext, useRef, type ReactNode} from 'react';
import {MessageProcessor} from '@a2ui/web_core/v0_9';
import type {SurfaceModel, A2uiMessage} from '../types';
import type {ReactComponentApi, ReactCatalog} from '../registry/ReactCatalog';
import type {OnActionCallbackV9} from '../types';

/**
 * The stable actions exposed by the v0.9 Provider.
 * These never change reference, so consuming them won't cause re-renders.
 */
export interface A2UIActionsV9 {
  /**
   * Process a list of v0.9 A2UI messages from the server.
   * Does NOT trigger a global React re-render - individual components
   * subscribe to their own data signals.
   */
  processMessages: (messages: A2uiMessage[]) => void;

  /**
   * Get a surface model by ID.
   */
  getSurface: (surfaceId: string) => SurfaceModel<ReactComponentApi> | undefined;

  /**
   * Get the underlying MessageProcessor for advanced usage.
   */
  getProcessor: () => MessageProcessor<ReactComponentApi>;

  /**
   * Subscribe to surface creation/deletion events.
   * Returns an unsubscribe function.
   */
  onSurfaceChange: (callback: () => void) => () => void;
}

const A2UIActionsContextV9 = createContext<A2UIActionsV9 | null>(null);

export interface A2UIProviderV9Props {
  /**
   * One or more ReactCatalog instances that define the available components.
   * The MessageProcessor uses the catalog ID from `createSurface` messages
   * to select the correct catalog.
   */
  catalogs: ReactCatalog[];

  /**
   * Callback invoked when a user action is dispatched from any surface.
   */
  onAction?: OnActionCallbackV9;

  children: ReactNode;
}

/**
 * Provider component for the v0.9 A2UI renderer.
 *
 * Key differences from v0.8 A2UIProvider:
 * - No global `version` state: individual components subscribe to their own
 *   data via Preact Signals, so only changed components re-render.
 * - Accepts `catalogs` instead of auto-initializing a default catalog.
 * - Actions are fully stable (no re-renders when actions are invoked).
 *
 * @example
 * ```tsx
 * const catalog = new ReactCatalog('my-catalog');
 * catalog.register('Text', { component: Text });
 * catalog.register('Button', { component: Button });
 *
 * function App() {
 *   return (
 *     <A2UIProviderV9
 *       catalogs={[catalog]}
 *       onAction={(action) => sendToServer(action)}
 *     >
 *       <A2UIRendererV9 surfaceId="main" />
 *     </A2UIProviderV9>
 *   );
 * }
 * ```
 */
export function A2UIProviderV9({catalogs, onAction, children}: A2UIProviderV9Props) {
  const processorRef = useRef<MessageProcessor<ReactComponentApi> | null>(null);
  const onActionRef = useRef<OnActionCallbackV9 | null>(onAction ?? null);
  onActionRef.current = onAction ?? null;

  if (!processorRef.current) {
    processorRef.current = new MessageProcessor<ReactComponentApi>(catalogs, (action) => {
      if (onActionRef.current) {
        void onActionRef.current(action);
      }
    });
  }
  const processor = processorRef.current;

  // Create stable actions object once
  const actionsRef = useRef<A2UIActionsV9 | null>(null);
  if (!actionsRef.current) {
    actionsRef.current = {
      processMessages: (messages: A2uiMessage[]) => {
        processor.processMessages(messages);
        // No setVersion() - Signal updates propagate directly to subscribed components
      },

      getSurface: (surfaceId: string) => {
        return processor.model.getSurface(surfaceId) as SurfaceModel<ReactComponentApi> | undefined;
      },

      getProcessor: () => processor,

      onSurfaceChange: (callback: () => void) => {
        const sub1 = processor.model.onSurfaceCreated.subscribe(() => callback());
        const sub2 = processor.model.onSurfaceDeleted.subscribe(() => callback());
        return () => {
          sub1.unsubscribe();
          sub2.unsubscribe();
        };
      },
    };
  }

  return (
    <A2UIActionsContextV9.Provider value={actionsRef.current}>
      {children}
    </A2UIActionsContextV9.Provider>
  );
}

/**
 * Hook to access v0.9 A2UI actions.
 * These are stable and will NOT cause re-renders when called.
 *
 * @throws If used outside of A2UIProviderV9
 */
export function useA2UIActionsV9(): A2UIActionsV9 {
  const actions = useContext(A2UIActionsContextV9);
  if (!actions) {
    throw new Error('useA2UIActionsV9 must be used within an A2UIProviderV9');
  }
  return actions;
}
