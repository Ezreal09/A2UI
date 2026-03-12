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

import type { A2uiMessage } from '@a2ui/react';

/**
 * Mock A2UI v0.9 messages for the restaurant finder demo.
 *
 * Validates the following renderer features:
 *  - root component lookup by id="root" (spec requirement)
 *  - theme: primaryColor, agentDisplayName injected via createSurface.theme
 *  - checks: TextField required validation + Button disabled when checks fail
 *  - sendDataModel: booking-form surface uses sendDataModel:true so the full
 *    data model snapshot is attached to every dispatched action
 *  - DynamicValue: { path } bindings for data-driven content
 *  - List template: { componentId, path } for dynamic restaurant cards
 *  - Two-way binding: TextField / DateTimeInput write back to DataModel
 *  - Actions: event dispatch with context bindings
 */

const CATALOG_ID = 'restaurant-catalog-v0.9';

const restaurantData = [
  {
    name: "Xi'an Famous Foods",
    detail: 'Spicy and savory hand-pulled noodles.',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400',
    rating: '★★★★☆',
    address: '81 St Marks Pl, New York, NY 10003',
  },
  {
    name: 'Han Dynasty',
    detail: 'Authentic Szechuan cuisine.',
    imageUrl: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=400',
    rating: '★★★★☆',
    address: '90 3rd Ave, New York, NY 10003',
  },
  {
    name: 'RedFarm',
    detail: 'Modern Chinese with a farm-to-table approach.',
    imageUrl: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400',
    rating: '★★★★☆',
    address: '529 Hudson St, New York, NY 10014',
  },
  {
    name: 'Mott 32',
    detail: 'Upscale Cantonese dining.',
    imageUrl: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400',
    rating: '★★★★★',
    address: '111 W 57th St, New York, NY 10019',
  },
  {
    name: 'Hwa Yuan Szechuan',
    detail: 'Famous for its cold noodles with sesame sauce.',
    imageUrl: 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=400',
    rating: '★★★★☆',
    address: '40 E Broadway, New York, NY 10002',
  },
];

/**
 * Restaurant list surface.
 * Validates: root id, theme (agentDisplayName + primaryColor), DynamicValue,
 *            List template, action context bindings.
 */
export function createRestaurantListMessagesV9(): A2uiMessage[] {
  return [
    {
      version: 'v0.9',
      createSurface: {
        surfaceId: 'restaurant-list',
        catalogId: CATALOG_ID,
        // ✅ Validates theme system: primaryColor → --a2ui-primary-color CSS var
        //    agentDisplayName → shown in catalog header via useA2UIThemeV9
        theme: {
          primaryColor: '#137fec',
          agentDisplayName: 'Restaurant Finder Agent',
          iconUrl: 'https://fonts.gstatic.com/s/i/short-term/release/materialsymbolsoutlined/restaurant/default/48px.svg',
        },
      },
    },
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId: 'restaurant-list',
        components: [
          // ✅ Root component id must be exactly "root" per v0.9 spec
          {
            id: 'root',
            component: 'Column',
            children: ['title-heading', 'item-list'],
          },
          {
            id: 'title-heading',
            component: 'Text',
            usageHint: 'h1',
            text: { path: '/title' },
          },
          {
            id: 'item-list',
            component: 'List',
            direction: 'vertical',
            // ✅ List template binding
            children: { componentId: 'item-card-template', path: '/items' },
          },
          {
            id: 'item-card-template',
            component: 'Card',
            child: 'card-layout',
          },
          {
            id: 'card-layout',
            component: 'Row',
            children: ['template-image', 'card-details'],
          },
          {
            id: 'template-image',
            component: 'Image',
            weight: 1,
            url: { path: 'imageUrl' },
          },
          {
            id: 'card-details',
            component: 'Column',
            weight: 2,
            children: ['template-name', 'template-rating', 'template-detail', 'template-book-button'],
          },
          {
            id: 'template-name',
            component: 'Text',
            usageHint: 'h3',
            text: { path: 'name' },
          },
          {
            id: 'template-rating',
            component: 'Text',
            text: { path: 'rating' },
          },
          {
            id: 'template-detail',
            component: 'Text',
            text: { path: 'detail' },
          },
          {
            id: 'template-book-button',
            component: 'Button',
            child: 'book-now-text',
            primary: true,
            // ✅ Action with context bindings
            action: {
              event: {
                name: 'book_restaurant',
                context: {
                  restaurantName: { path: 'name' },
                  imageUrl: { path: 'imageUrl' },
                  address: { path: 'address' },
                },
              },
            },
          },
          { id: 'book-now-text', component: 'Text', text: 'Book Now' },
        ],
      },
    },
    {
      version: 'v0.9',
      updateDataModel: {
        surfaceId: 'restaurant-list',
        path: '/',
        value: {
          title: 'Top 5 Chinese Restaurants in New York',
          items: Object.fromEntries(
            restaurantData.map((r, i) => [
              `item${i + 1}`,
              { name: r.name, rating: r.rating, detail: r.detail, imageUrl: r.imageUrl, address: r.address },
            ])
          ),
        },
      },
    },
  ];
}

/**
 * Booking form surface.
 * Validates: checks (required validation on partySize + reservationTime),
 *            Button disabled when checks fail, sendDataModel:true (full data
 *            model snapshot attached to submit action), two-way binding.
 */
export function createBookingFormMessagesV9(
  restaurantName: string,
  imageUrl: string,
  address: string
): A2uiMessage[] {
  return [
    {
      version: 'v0.9',
      createSurface: {
        surfaceId: 'booking-form',
        catalogId: CATALOG_ID,
        // ✅ Validates sendDataModel: every action will carry surface.dataModel snapshot
        sendDataModel: true,
        theme: {
          primaryColor: '#0f9d58',
          agentDisplayName: 'Booking Assistant',
        },
      },
    },
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId: 'booking-form',
        components: [
          // ✅ id="root" required
          {
            id: 'root',
            component: 'Column',
            children: [
              'booking-title',
              'restaurant-image',
              'restaurant-address',
              'party-size-field',
              'datetime-field',
              'dietary-field',
              'submit-button',
            ],
          },
          {
            id: 'booking-title',
            component: 'Text',
            usageHint: 'h2',
            text: { path: '/title' },
          },
          {
            id: 'restaurant-image',
            component: 'Image',
            url: { path: '/imageUrl' },
          },
          {
            id: 'restaurant-address',
            component: 'Text',
            text: { path: '/address' },
          },
          {
            id: 'party-size-field',
            component: 'TextField',
            label: 'Party Size *',
            text: { path: '/partySize' },
            textFieldType: 'number',
            // ✅ Validates checks: required — partySize must not be empty
            checks: [
              {
                call: 'required',
                args: { value: { path: '/partySize' } },
                message: 'Party size is required.',
              },
            ],
          },
          {
            id: 'datetime-field',
            component: 'DateTimeInput',
            label: 'Date & Time *',
            value: { path: '/reservationTime' },
            enableDate: true,
            enableTime: true,
            // ✅ Validates checks: required — reservationTime must not be empty
            checks: [
              {
                call: 'required',
                args: { value: { path: '/reservationTime' } },
                message: 'Reservation date & time is required.',
              },
            ],
          },
          {
            id: 'dietary-field',
            component: 'TextField',
            label: 'Dietary Requirements (optional)',
            text: { path: '/dietary' },
          },
          {
            id: 'submit-button',
            component: 'Button',
            child: 'submit-reservation-text',
            primary: true,
            // ✅ Validates Button disabled: all field checks must pass
            checks: [
              {
                call: 'required',
                args: { value: { path: '/partySize' } },
                message: 'Fill in party size to submit.',
              },
              {
                call: 'required',
                args: { value: { path: '/reservationTime' } },
                message: 'Fill in date & time to submit.',
              },
            ],
            action: {
              event: {
                name: 'submit_booking',
                context: {
                  restaurantName: { path: '/restaurantName' },
                  partySize: { path: '/partySize' },
                  reservationTime: { path: '/reservationTime' },
                  dietary: { path: '/dietary' },
                  imageUrl: { path: '/imageUrl' },
                },
              },
            },
          },
          { id: 'submit-reservation-text', component: 'Text', text: 'Submit Reservation' },
        ],
      },
    },
    {
      version: 'v0.9',
      updateDataModel: {
        surfaceId: 'booking-form',
        path: '/',
        value: {
          title: `Book a Table at ${restaurantName}`,
          address,
          restaurantName,
          partySize: '',
          reservationTime: '',
          dietary: '',
          imageUrl,
        },
      },
    },
  ];
}

/**
 * Booking confirmation surface.
 * Validates: root id, DynamicValue path bindings, Divider component.
 */
export function createConfirmationMessagesV9(
  restaurantName: string,
  partySize: string,
  reservationTime: string,
  dietary: string,
  imageUrl: string
): A2uiMessage[] {
  return [
    {
      version: 'v0.9',
      createSurface: {
        surfaceId: 'confirmation',
        catalogId: CATALOG_ID,
        theme: {
          primaryColor: '#ea4335',
          agentDisplayName: 'Booking Confirmed!',
        },
      },
    },
    {
      version: 'v0.9',
      updateComponents: {
        surfaceId: 'confirmation',
        components: [
          // ✅ id="root" required
          {
            id: 'root',
            component: 'Card',
            child: 'confirmation-column',
          },
          {
            id: 'confirmation-column',
            component: 'Column',
            children: [
              'confirm-title',
              'confirm-image',
              'divider1',
              'confirm-details',
              'divider2',
              'confirm-dietary',
              'divider3',
              'confirm-text',
            ],
          },
          { id: 'confirm-title', component: 'Text', usageHint: 'h2', text: { path: '/title' } },
          { id: 'confirm-image', component: 'Image', url: { path: '/imageUrl' } },
          { id: 'confirm-details', component: 'Text', text: { path: '/bookingDetails' } },
          { id: 'confirm-dietary', component: 'Text', text: { path: '/dietaryRequirements' } },
          { id: 'confirm-text', component: 'Text', usageHint: 'h5', text: 'We look forward to seeing you!' },
          { id: 'divider1', component: 'Divider' },
          { id: 'divider2', component: 'Divider' },
          { id: 'divider3', component: 'Divider' },
        ],
      },
    },
    {
      version: 'v0.9',
      updateDataModel: {
        surfaceId: 'confirmation',
        path: '/',
        value: {
          title: `Booking Confirmed at ${restaurantName}`,
          bookingDetails: `${partySize} people at ${reservationTime || 'TBD'}`,
          dietaryRequirements: dietary
            ? `Dietary Requirements: ${dietary}`
            : 'No dietary requirements specified',
          imageUrl,
        },
      },
    },
  ];
}
