/// <reference types="vite/client" />

// Teach TypeScript that SVG files imported in Vite return a URL string
declare module '*.svg' {
  const src: string;
  export default src;
}
