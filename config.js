// ============================================================
//  config.js — THE ONLY FILE YOU NEED TO EDIT
// ============================================================
window.LEVI_CONFIG = {
  name: 'LEVI',
  age: 16,

  // Sign-off on the final screen. Rendered as "— Your friend, Mike".
  from: 'Your friend, Mike',

  // Level 2 joke: what the Apple Store charges for the replacement AirPods.
  airpodsPrice: '$179',

  prizes: {
    // Level 1 prize
    chickfila: {
      brand: 'Chick-fil-A',
      amount: '$20',
      // Paste the e-gift-card link here. Either a plain URL...
      //   url: 'https://www.example.com/your-egift-link',
      // ...or, to keep it out of view-source for nosy teenagers, a base64 version prefixed with "b64:".
      // Make one in any browser console:  btoa('https://www.example.com/your-egift-link')
      url: 'b64:aHR0cHM6Ly9tZXJjaGFudC53Z2lmdGNhcmQuY29tL2NhcmQvdmlydHVhbC9jZXJ0L2NmYS8zMDQvMzY3ODc5OTY2LzU3TVVTSDJHWU0=',
    },
    // Bonus round prize
    wingstop: {
      brand: 'Wingstop',
      amount: '$20',
      url: 'b64:aHR0cHM6Ly9lY2FyZC5jbGFpbS5jYXJkcy93cTd3R0tNNzgwTTBPd2lmVzJsU1BVYm8/bD1lbl9VUw==',
    },
  },

  // Look & feel
  pixelHeadLevels: 0,   // 0 = keep photo colors on the head; try 6–8 for a chunkier "8-bit palette" look
  headOutline: true,    // draw a 1px dark outline around the head so it reads like a sprite
};
