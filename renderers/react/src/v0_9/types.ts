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

// Re-export v0.9 core types for use within the React renderer
export type {
  SurfaceModel,
  ComponentModel,
  DataContext,
  DataSubscription,
  SurfaceGroupModel,
  ComponentApi,
  Catalog,
} from '@a2ui/web_core/v0_9';

export type {
  DynamicString,
  DynamicNumber,
  DynamicBoolean,
  DynamicValue,
  Action,
  ChildList,
  AnyComponent,
  DataBinding,
  FunctionCall,
  CheckRule,
  Checkable,
} from '@a2ui/web_core/v0_9';

export type {
  A2uiMessage,
  CreateSurfaceMessage,
  UpdateComponentsMessage,
  UpdateDataModelMessage,
  DeleteSurfaceMessage,
} from '@a2ui/web_core/v0_9';

import type {SurfaceModel} from '@a2ui/web_core/v0_9';
import type {ComponentApi} from '@a2ui/web_core/v0_9';

/**
 * Props passed to all v0.9 A2UI React components.
 *
 * Unlike v0.8 which passes the entire resolved node tree,
 * v0.9 passes only the component ID and the surface model.
 * Components read their own properties from the surface.
 */
export interface A2UIComponentPropsV9<T extends ComponentApi = ComponentApi> {
  /** The unique ID of this component within the surface */
  componentId: string;
  /** The surface model this component belongs to */
  surface: SurfaceModel<T>;
}

/**
 * Callback invoked when a user action is dispatched from a v0.9 surface.
 */
export type OnActionCallbackV9 = (action: any) => void | Promise<void>;
