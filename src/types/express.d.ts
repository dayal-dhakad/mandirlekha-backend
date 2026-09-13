declare global {
  namespace Express {
    interface Request { ownerId?: string }
  }
}
export {};

