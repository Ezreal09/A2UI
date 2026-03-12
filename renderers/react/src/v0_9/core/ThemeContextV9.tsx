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

import {createContext, useContext} from 'react';

/**
 * Theme parameters for a v0.9 A2UI surface.
 * These values come from the `theme` field in the `createSurface` message.
 */
export interface ThemeV9 {
  /** The primary brand color (e.g. "#1a73e8"). Used for buttons, accents, etc. */
  primaryColor?: string;
  /** URL of the agent icon shown in the UI header. */
  iconUrl?: string;
  /** Display name of the agent, shown in headers or titles. */
  agentDisplayName?: string;
  /** Any additional theme properties passed by the server. */
  [key: string]: unknown;
}

/** Default (empty) theme used when no theme is provided. */
const DEFAULT_THEME: ThemeV9 = {};

/**
 * React context that provides v0.9 theme values to the component tree.
 * Populated by `A2UIRendererV9` from `surface.theme`.
 */
export const ThemeContextV9 = createContext<ThemeV9>(DEFAULT_THEME);

/**
 * Hook to access the v0.9 theme from any component inside an A2UIRendererV9.
 *
 * @example
 * ```tsx
 * function MyButton() {
 *   const theme = useA2UIThemeV9();
 *   return (
 *     <button style={{background: theme.primaryColor ?? '#1a73e8'}}>
 *       Click me
 *     </button>
 *   );
 * }
 * ```
 */
export function useA2UIThemeV9(): ThemeV9 {
  return useContext(ThemeContextV9);
}
