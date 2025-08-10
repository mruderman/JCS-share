import '@testing-library/jest-dom';

// Mock window.location for tests
Object.defineProperty(window, 'location', {
  value: {
    origin: 'https://example.com',
    href: 'https://example.com',
  },
  writable: true,
});
