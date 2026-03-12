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

// Core components and provider
export {A2UIProvider, useA2UIActions, useA2UIState, useA2UIContext} from './core/A2UIProvider';
export type {A2UIProviderProps} from './core/A2UIProvider';
export {A2UIRenderer} from './core/A2UIRenderer';
export type {A2UIRendererProps} from './core/A2UIRenderer';
export {A2UIViewer} from './core/A2UIViewer';
export type {A2UIViewerProps, ComponentInstance, A2UIActionEvent} from './core/A2UIViewer';
export {ComponentNode} from './core/ComponentNode';

// Hooks
export {useA2UI} from './hooks/useA2UI';
export type {UseA2UIResult} from './hooks/useA2UI';
export {useA2UIComponent} from './hooks/useA2UIComponent';
export type {UseA2UIComponentResult} from './hooks/useA2UIComponent';

// Registry
export {ComponentRegistry} from './registry/ComponentRegistry';
export {registerDefaultCatalog, initializeDefaultCatalog} from './registry/defaultCatalog';

// Theme
export {ThemeProvider, useTheme, useThemeOptional} from './theme/ThemeContext';
export {litTheme, defaultTheme} from './theme/litTheme';

// Utilities
export {cn, classMapToString, stylesToObject} from './lib/utils';

// Types - re-export from types
export type {
  Types,
  Primitives,
  AnyComponentNode,
  Surface,
  SurfaceID,
  Theme,
  ServerToClientMessage,
  A2UIClientEventMessage,
  Action,
  DataValue,
  MessageProcessor,
  StringValue,
  NumberValue,
  BooleanValue,
  A2UIComponentProps,
  ComponentRegistration,
  ComponentLoader,
  OnActionCallback,
  A2UIProviderConfig,
} from './types';

// Content components
export {Text} from './components/content/Text';
export {Image} from './components/content/Image';
export {Icon} from './components/content/Icon';
export {Divider} from './components/content/Divider';
export {Video} from './components/content/Video';
export {AudioPlayer} from './components/content/AudioPlayer';

// Layout components
export {Row} from './components/layout/Row';
export {Column} from './components/layout/Column';
export {List} from './components/layout/List';
export {Card} from './components/layout/Card';
export {Tabs} from './components/layout/Tabs';
export {Modal} from './components/layout/Modal';

// Interactive components
export {Button} from './components/interactive/Button';
export {TextField} from './components/interactive/TextField';
export {CheckBox} from './components/interactive/CheckBox';
export {Slider} from './components/interactive/Slider';
export {DateTimeInput} from './components/interactive/DateTimeInput';
export {MultipleChoice} from './components/interactive/MultipleChoice';

// v0.9 - Core provider and renderer
export {A2UIProviderV9, useA2UIActionsV9} from './v0_9/core/A2UIProviderV9';
export type {A2UIProviderV9Props, A2UIActionsV9} from './v0_9/core/A2UIProviderV9';
export {A2UIRendererV9} from './v0_9/core/A2UIRendererV9';
export type {A2UIRendererV9Props} from './v0_9/core/A2UIRendererV9';
export {ComponentNodeV9, renderChildren} from './v0_9/core/ComponentNodeV9';

// v0.9 - Theme
export {ThemeContextV9, useA2UIThemeV9} from './v0_9/core/ThemeContextV9';
export type {ThemeV9} from './v0_9/core/ThemeContextV9';

// v0.9 - Registry
export {
  ReactCatalog,
  ReactComponentApi,
  createDefaultReactCatalog,
} from './v0_9/registry/ReactCatalog';
export type {ComponentRegistrationV9, FunctionImplementation} from './v0_9/registry/ReactCatalog';

// v0.9 - Hooks
export {useA2UIComponentV9, useDataPath, useChecks} from './v0_9/hooks/useA2UIComponentV9';
export type {UseA2UIComponentV9Result} from './v0_9/hooks/useA2UIComponentV9';

// v0.9 - Types
export type {
  A2UIComponentPropsV9,
  OnActionCallbackV9,
  SurfaceModel,
  ComponentModel,
  DataContext,
  DataSubscription,
  SurfaceGroupModel,
  ComponentApi,
  Catalog,
  DynamicString,
  DynamicNumber,
  DynamicBoolean,
  DynamicValue,
  Action as ActionV9,
  ChildList,
  AnyComponent,
  DataBinding,
  FunctionCall,
  CheckRule,
  Checkable,
  A2uiMessage,
  CreateSurfaceMessage,
  UpdateComponentsMessage,
  UpdateDataModelMessage,
  DeleteSurfaceMessage,
} from './v0_9/types';
