export const firstVersionRoutePaths = [
  '/brands',
  '/canvas',
  '/monitoring',
  '/growth-optimization',
  '/competitors',
  '/citations',
  '/evaluations',
  '/content',
  '/content-generation',
  '/publishing',
  '/model-settings',
  '/tasks',
  '/feedback',
  '/reports',
  '/advisor'
] as const;

export type FirstVersionRoutePath = (typeof firstVersionRoutePaths)[number];
