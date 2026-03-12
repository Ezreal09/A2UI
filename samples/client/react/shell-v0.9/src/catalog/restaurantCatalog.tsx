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

import { memo, useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { ComponentType } from 'react';
import {
  ReactCatalog,
  createDefaultReactCatalog,
  ComponentNodeV9,
  useA2UIComponentV9,
  useA2UIThemeV9,
  useChecks,
  useDataPath,
  renderChildren,
  type A2UIComponentPropsV9,
  type DynamicString,
  type ChildList,
  type ActionV9 as Action,
  type CheckRule,
} from '@a2ui/react';

// ── Data context path for list-item scoping ───────────────────────────────────

const DataContextPathCtx = createContext<string>('/');

export function useDataContextPath(): string {
  return useContext(DataContextPathCtx);
}

// ── SurfaceHeader (theme demo) ────────────────────────────────────────────────
// Renders the agent name and a colored accent bar using useA2UIThemeV9.
// This component is rendered as the first child of the root "Column" so every
// surface shows the theme in action.

const SurfaceHeaderV9 = memo(function SurfaceHeaderV9() {
  const theme = useA2UIThemeV9();
  if (!theme.agentDisplayName && !theme.iconUrl) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 0 12px',
        borderBottom: `2px solid ${theme.primaryColor ?? '#137fec'}`,
        marginBottom: '4px',
      }}
    >
      {theme.iconUrl && (
        <img
          src={theme.iconUrl}
          alt=""
          style={{ width: '20px', height: '20px', opacity: 0.8 }}
        />
      )}
      {theme.agentDisplayName && (
        <span style={{ fontSize: '12px', fontWeight: 700, opacity: 0.65, letterSpacing: '0.5px' }}>
          {String(theme.agentDisplayName)}
        </span>
      )}
    </div>
  );
});

// ── Text ──────────────────────────────────────────────────────────────────────

const TextV9 = memo(function TextV9({ componentId, surface }: A2UIComponentPropsV9) {
  const dataContextPath = useDataContextPath();
  const { resolveString } = useA2UIComponentV9(componentId, surface, dataContextPath);
  const model = surface.componentsModel.get(componentId);
  const props = model?.properties ?? {};
  const text = resolveString(props.text as DynamicString);
  const usageHint = props.usageHint as string | undefined;

  if (!text) return null;

  const style: React.CSSProperties = { margin: '4px 0' };
  switch (usageHint) {
    case 'h1': return <h1 style={{ ...style, fontSize: '28px', fontWeight: 700 }}>{text}</h1>;
    case 'h2': return <h2 style={{ ...style, fontSize: '22px', fontWeight: 700 }}>{text}</h2>;
    case 'h3': return <h3 style={{ ...style, fontSize: '18px', fontWeight: 600 }}>{text}</h3>;
    case 'h4': return <h4 style={{ ...style, fontSize: '16px', fontWeight: 600 }}>{text}</h4>;
    case 'h5': return <h5 style={{ ...style, fontSize: '14px', fontWeight: 600, opacity: 0.75 }}>{text}</h5>;
    default:   return <p style={{ ...style, fontSize: '14px', lineHeight: 1.5 }}>{text}</p>;
  }
});

// ── Image ─────────────────────────────────────────────────────────────────────

const ImageV9 = memo(function ImageV9({ componentId, surface }: A2UIComponentPropsV9) {
  const dataContextPath = useDataContextPath();
  const { resolveString } = useA2UIComponentV9(componentId, surface, dataContextPath);
  const model = surface.componentsModel.get(componentId);
  const props = model?.properties ?? {};
  const url = resolveString(props.url as DynamicString);

  if (!url) return null;
  return (
    <img
      src={url}
      alt=""
      style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '8px', display: 'block' }}
    />
  );
});

// ── Divider ───────────────────────────────────────────────────────────────────

const DividerV9 = memo(function DividerV9(_: A2UIComponentPropsV9) {
  return <hr style={{ border: 'none', borderTop: '1px solid rgba(128,128,128,0.2)', margin: '8px 0' }} />;
});

// ── Column ────────────────────────────────────────────────────────────────────
// The root Column always prepends the SurfaceHeader so theme is visible.

const ColumnV9 = memo(function ColumnV9({ componentId, surface }: A2UIComponentPropsV9) {
  const model = surface.componentsModel.get(componentId);
  const props = model?.properties ?? {};
  const children = props.children as ChildList | undefined;
  // Show the theme header only for root column (id === 'root')
  const isRoot = componentId === 'root';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      {isRoot && <SurfaceHeaderV9 />}
      {renderChildren(children, surface)}
    </div>
  );
});

// ── Row ───────────────────────────────────────────────────────────────────────

const RowV9 = memo(function RowV9({ componentId, surface }: A2UIComponentPropsV9) {
  const model = surface.componentsModel.get(componentId);
  const children = model?.properties.children as ChildList | undefined;
  return (
    <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'flex-start' }}>
      {renderChildren(children, surface)}
    </div>
  );
});

// ── Card ──────────────────────────────────────────────────────────────────────
// Card can also be root — in that case show the SurfaceHeader above its child.

const CardV9 = memo(function CardV9({ componentId, surface }: A2UIComponentPropsV9) {
  const model = surface.componentsModel.get(componentId);
  const childId = model?.properties.child as string | undefined;
  const isRoot = componentId === 'root';

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '12px',
        border: '1px solid rgba(128,128,128,0.15)',
        padding: '16px',
        width: '100%',
      }}
    >
      {isRoot && <SurfaceHeaderV9 />}
      {childId && <ComponentNodeV9 componentId={childId} surface={surface} />}
    </div>
  );
});

// ── List (dynamic template) ───────────────────────────────────────────────────

const ListV9 = memo(function ListV9({ componentId, surface }: A2UIComponentPropsV9) {
  const model = surface.componentsModel.get(componentId);
  type ListChildren = { componentId: string; path: string } | string[];
  const children = model?.properties.children as ListChildren | undefined;

  if (children && !Array.isArray(children) && 'componentId' in children) {
    return (
      <DynamicList
        templateComponentId={children.componentId}
        dataPath={children.path}
        surface={surface}
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {renderChildren(children as ChildList | undefined, surface)}
    </div>
  );
});

function DynamicList({
  templateComponentId,
  dataPath,
  surface,
}: {
  templateComponentId: string;
  dataPath: string;
  surface: A2UIComponentPropsV9['surface'];
}) {
  const absolutePath = dataPath.startsWith('/') ? dataPath : `/${dataPath}`;
  const items = useDataPath(surface, absolutePath) as Record<string, unknown> | null;

  if (!items || typeof items !== 'object') return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
      {Object.keys(items).map((key) => (
        <DataContextPathCtx.Provider key={key} value={`${absolutePath}/${key}`}>
          <ComponentNodeV9 componentId={templateComponentId} surface={surface} />
        </DataContextPathCtx.Provider>
      ))}
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────────
// ✅ Validates checks: evaluates checks array; disables button if any fail.
// The failed check messages are shown as a tooltip on the disabled button.
//
// IMPORTANT: ComponentNodeV9 only re-renders on ComponentModel.onUpdated (i.e.
// server-pushed property changes). For checks that reference DataModel paths,
// we must subscribe to the root data path so any user input triggers a re-render
// and a fresh evaluateChecks() call.

const ButtonV9 = memo(function ButtonV9({ componentId, surface }: A2UIComponentPropsV9) {
  const dataContextPath = useDataContextPath();
  const { sendAction, dataContext } = useA2UIComponentV9(componentId, surface, dataContextPath);
  const model = surface.componentsModel.get(componentId);
  const props = model?.properties ?? {};
  const childId = props.child as string | undefined;
  const isPrimary = Boolean(props.primary);
  const action = props.action as Action | undefined;
  const checks = props.checks as CheckRule[] | undefined;

  // useChecks subscribes to DataModel changes and re-evaluates rules reactively.
  const { errors, isDisabled } = useChecks(checks, surface, dataContext);
  const theme = useA2UIThemeV9();
  const primaryColor = theme.primaryColor ?? '#137fec';

  return (
    <div>
      <button
        disabled={isDisabled}
        title={isDisabled ? errors.join(' • ') : undefined}
        onClick={() => { if (!isDisabled && action) sendAction(action); }}
        style={{
          padding: '10px 20px',
          borderRadius: '8px',
          border: isPrimary ? 'none' : '1.5px solid rgba(128,128,128,0.3)',
          background: isPrimary ? (isDisabled ? 'rgba(128,128,128,0.25)' : primaryColor) : 'transparent',
          color: isPrimary ? (isDisabled ? 'rgba(255,255,255,0.4)' : '#fff') : 'inherit',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          fontSize: '14px',
          fontWeight: 600,
          alignSelf: 'flex-start',
          transition: 'background 0.2s, color 0.2s',
        }}
      >
        {childId && <ComponentNodeV9 componentId={childId} surface={surface} />}
      </button>
      {isDisabled && (
        <div style={{ fontSize: '11px', color: '#f87171', marginTop: '4px', paddingLeft: '2px' }}>
          {errors[0]}
        </div>
      )}
    </div>
  );
});

// ── TextField ─────────────────────────────────────────────────────────────────
// ✅ Validates checks: shows inline error message when check fails.

const TextFieldV9 = memo(function TextFieldV9({ componentId, surface }: A2UIComponentPropsV9) {
  const { resolveString, setValue, getValue, evaluateChecks } = useA2UIComponentV9(componentId, surface);
  const model = surface.componentsModel.get(componentId);
  const props = model?.properties ?? {};
  const label = resolveString(props.label as DynamicString);
  const textBinding = props.text as { path?: string } | string | undefined;
  const fieldType = props.textFieldType as string | undefined;
  const checks = props.checks as CheckRule[] | undefined;
  const textPath = typeof textBinding === 'object' && textBinding?.path ? textBinding.path : null;
  const [touched, setTouched] = useState(false);

  const [localValue, setLocalValue] = useState<string>(() => {
    if (!textPath) return '';
    const v = getValue(textPath);
    return v != null ? String(v) : '';
  });

  useEffect(() => {
    if (!textPath) return;
    const v = getValue(textPath);
    setLocalValue(v != null ? String(v) : '');
  }, [getValue, textPath]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalValue(val);
      if (textPath) setValue(textPath, val);
    },
    [textPath, setValue]
  );

  // Only show errors after the user has touched the field
  const errors = touched ? evaluateChecks(checks) : [];
  const hasError = errors.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 600, opacity: 0.75 }}>{label}</label>}
      <input
        type={fieldType === 'number' ? 'number' : 'text'}
        value={localValue}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          border: hasError
            ? '1.5px solid #f87171'
            : '1.5px solid rgba(128,128,128,0.2)',
          background: 'rgba(255,255,255,0.06)',
          color: 'inherit',
          fontFamily: 'inherit',
          fontSize: '14px',
          outline: 'none',
        }}
      />
      {hasError && (
        <span style={{ fontSize: '11px', color: '#f87171' }}>{errors[0]}</span>
      )}
    </div>
  );
});

// ── DateTimeInput ─────────────────────────────────────────────────────────────
// ✅ Validates checks: shows inline error message when check fails.

const DateTimeInputV9 = memo(function DateTimeInputV9({ componentId, surface }: A2UIComponentPropsV9) {
  const { resolveString, setValue, getValue, evaluateChecks } = useA2UIComponentV9(componentId, surface);
  const model = surface.componentsModel.get(componentId);
  const props = model?.properties ?? {};
  const label = resolveString(props.label as DynamicString);
  const valueBinding = props.value as { path?: string } | string | undefined;
  const enableDate = Boolean(props.enableDate);
  const enableTime = Boolean(props.enableTime);
  const checks = props.checks as CheckRule[] | undefined;
  const valuePath = typeof valueBinding === 'object' && valueBinding?.path ? valueBinding.path : null;
  const [touched, setTouched] = useState(false);

  const [localValue, setLocalValue] = useState<string>(() => {
    if (!valuePath) return '';
    const v = getValue(valuePath);
    return v != null ? String(v) : '';
  });

  const inputType = enableDate && enableTime ? 'datetime-local' : enableDate ? 'date' : 'time';

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalValue(val);
      if (valuePath) setValue(valuePath, val);
    },
    [valuePath, setValue]
  );

  const errors = touched ? evaluateChecks(checks) : [];
  const hasError = errors.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: 600, opacity: 0.75 }}>{label}</label>}
      <input
        type={inputType}
        value={localValue}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        style={{
          padding: '8px 12px',
          borderRadius: '8px',
          border: hasError
            ? '1.5px solid #f87171'
            : '1.5px solid rgba(128,128,128,0.2)',
          background: 'rgba(255,255,255,0.06)',
          color: 'inherit',
          fontFamily: 'inherit',
          fontSize: '14px',
          outline: 'none',
        }}
      />
      {hasError && (
        <span style={{ fontSize: '11px', color: '#f87171' }}>{errors[0]}</span>
      )}
    </div>
  );
});

// ── Build the Catalog ─────────────────────────────────────────────────────────

/**
 * Creates a ReactCatalog with all components needed for the restaurant demo.
 *
 * Registered components exercise these v0.9 renderer features:
 *  - SurfaceHeaderV9  → useA2UIThemeV9 (theme system)
 *  - ButtonV9         → evaluateChecks / disabled state (checks mechanism)
 *  - TextFieldV9      → evaluateChecks / inline error (checks mechanism)
 *  - DateTimeInputV9  → evaluateChecks / inline error (checks mechanism)
 *  - ListV9 + DynamicList → useDataPath / list template (DynamicValue + data binding)
 *  - ColumnV9 / RowV9 / CardV9 → renderChildren / ComponentNodeV9 (layout)
 */
export function createRestaurantCatalog(catalogId: string): ReactCatalog {
  const catalog = createDefaultReactCatalog(catalogId);

  const reg = (name: string, component: ComponentType<A2UIComponentPropsV9>) =>
    catalog.register(name, { component });

  reg('Text', TextV9);
  reg('Image', ImageV9);
  reg('Divider', DividerV9);
  reg('Column', ColumnV9);
  reg('Row', RowV9);
  reg('Card', CardV9);
  reg('List', ListV9);
  reg('Button', ButtonV9);
  reg('TextField', TextFieldV9);
  reg('DateTimeInput', DateTimeInputV9);

  return catalog;
}
