/**
 * print-schema.ts — print the full GraphQL schema in SDL format.
 *
 * Usage:
 *   bun run scripts/print-schema.ts
 *   bun run scripts/print-schema.ts > schema.graphql   # save to file
 */

import { printSchema } from "graphql"

import { schema } from "../src/graphql/schema"

console.log(printSchema(schema))
