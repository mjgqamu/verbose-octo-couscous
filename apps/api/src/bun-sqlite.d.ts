declare module "bun:sqlite" {
 export class Database { constructor(filename?: string, options?: number | object); exec(query: string): void; close(): void; }
}
