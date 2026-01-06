/**
 * GraphQL Integration Tests
 *
 * Tests GraphQL Yoga integration with Hono, authentication middleware,
 * and Prisma database operations.
 *
 * Test Coverage:
 * 1. GraphQL server initialization
 * 2. me query with valid authentication
 * 3. me query without authentication (401 error)
 * 4. Invalid session cookie handling
 * 5. Prisma database query execution
 * 6. GraphQL error response format
 * 7. Expired session handling
 * 8. GraphQL introspection availability
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { PrismaClient } from "@generated/prisma/client";
import {
  createTestPrismaClient,
  cleanupTestPrisma,
} from "@tests/fixtures/prisma";
import {
  executeGraphQL,
  createTestUserWithSession,
  createTestUserWithExpiredSession,
  parseGraphQLResponse,
} from "@tests/fixtures/graphql";

describe("GraphQL Integration", () => {
  let testPrisma: PrismaClient;

  beforeEach(() => {
    testPrisma = createTestPrismaClient();
  });

  afterEach(async () => {
    await cleanupTestPrisma(testPrisma);
  });

  /**
   * Test Case 1: GraphQL Server Initialization
   */
  test("should initialize GraphQL server successfully", async () => {
    // Act: Send a simple query to check server is running
    const response = await executeGraphQL(`
      query {
        __typename
      }
    `);

    // Assert: Server should respond with 200 OK
    expect(response.status).toBe(200);

    const result = await parseGraphQLResponse(response);
    expect(result.data).toBeDefined();
    expect((result.data as { __typename: string }).__typename).toBe("Query");
  });

  /**
   * Test Case 2: me Query with Valid Authentication
   */
  test("should return user data for authenticated me query", async () => {
    // Arrange: Create test user with valid session
    const { user, sessionToken } =
      await createTestUserWithSession(testPrisma);

    // Act: Execute me query with session cookie
    const response = await executeGraphQL(
      `
      query {
        me {
          id
          email
          name
          image
          emailVerified
          createdAt
          updatedAt
        }
      }
    `,
      undefined,
      sessionToken,
    );

    // Assert: Should return user data
    expect(response.status).toBe(200);

    const result = await parseGraphQLResponse<{ me: unknown }>(response);
    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data?.me).toBeDefined();

    const meData = result.data?.me as {
      id: string;
      email: string;
      name: string | null;
    };
    expect(meData.id).toBe(user.id);
    expect(meData.email).toBe(user.email);
    expect(meData.name).toBe(user.name);
  });

  /**
   * Test Case 3: me Query without Authentication (401 Error)
   */
  test("should return 401 error for unauthenticated me query", async () => {
    // Act: Execute me query without session cookie
    const response = await executeGraphQL(`
      query {
        me {
          id
          email
        }
      }
    `);

    // Assert: Should return GraphQL error with UNAUTHORIZED code
    expect(response.status).toBe(200); // GraphQL always returns 200

    const result = await parseGraphQLResponse(response);
    expect(result.errors).toBeDefined();
    expect(result.errors?.length).toBeGreaterThan(0);

    const error = result.errors?.[0];
    expect(error?.message).toContain("Unauthorized");
    expect(error?.extensions?.code).toBe("UNAUTHORIZED");
  });

  /**
   * Test Case 4: Invalid Session Cookie Handling
   */
  test("should reject invalid session cookie", async () => {
    // Arrange: Use non-existent session token
    const invalidSessionToken = `invalid-session-${Date.now()}`;

    // Act: Execute me query with invalid session
    const response = await executeGraphQL(
      `
      query {
        me {
          id
        }
      }
    `,
      undefined,
      invalidSessionToken,
    );

    // Assert: Should return unauthorized error
    expect(response.status).toBe(200);

    const result = await parseGraphQLResponse(response);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.message).toContain("Unauthorized");
  });

  /**
   * Test Case 5: Prisma Database Query Execution
   */
  test("should execute Prisma queries correctly in resolver", async () => {
    // Arrange: Create test user with session
    const { user, sessionToken } =
      await createTestUserWithSession(testPrisma);

    // Act: Execute me query (which uses Prisma internally)
    const response = await executeGraphQL(
      `
      query {
        me {
          id
          email
          createdAt
          updatedAt
        }
      }
    `,
      undefined,
      sessionToken,
    );

    // Assert: Data should match database
    const result = await parseGraphQLResponse<{ me: unknown }>(response);
    const meData = result.data?.me as {
      id: string;
      email: string;
      createdAt: string;
      updatedAt: string;
    };

    expect(meData.id).toBe(user.id);
    expect(meData.email).toBe(user.email);

    // Dates should be ISO strings
    expect(new Date(meData.createdAt).toISOString()).toBe(
      user.createdAt.toISOString(),
    );
    expect(new Date(meData.updatedAt).toISOString()).toBe(
      user.updatedAt.toISOString(),
    );
  });

  /**
   * Test Case 6: GraphQL Error Response Format
   */
  test("should return properly formatted GraphQL errors", async () => {
    // Act: Execute query without authentication
    const response = await executeGraphQL(`
      query {
        me {
          id
        }
      }
    `);

    // Assert: Error should follow GraphQL spec
    const result = await parseGraphQLResponse(response);
    expect(result.errors).toBeDefined();

    const error = result.errors?.[0];
    expect(error).toBeDefined();
    expect(error?.message).toBeDefined();
    expect(typeof error?.message).toBe("string");
    expect(error?.extensions).toBeDefined();
    expect(error?.extensions?.code).toBeDefined();
  });

  /**
   * Test Case 7: Expired Session Handling
   */
  test("should reject expired session", async () => {
    // Arrange: Create user with expired session
    const { sessionToken } =
      await createTestUserWithExpiredSession(testPrisma);

    // Act: Execute me query with expired session
    const response = await executeGraphQL(
      `
      query {
        me {
          id
        }
      }
    `,
      undefined,
      sessionToken,
    );

    // Assert: Should return unauthorized error
    const result = await parseGraphQLResponse(response);
    expect(result.errors).toBeDefined();
    expect(result.errors?.[0]?.message).toContain("Unauthorized");
  });

  /**
   * Test Case 8: GraphQL Introspection Availability
   */
  test("should support GraphQL introspection", async () => {
    // Act: Execute introspection query
    const response = await executeGraphQL(`
      query {
        __schema {
          queryType {
            name
          }
          types {
            name
          }
        }
      }
    `);

    // Assert: Should return schema information
    expect(response.status).toBe(200);

    const result = await parseGraphQLResponse<{ __schema: unknown }>(response);
    expect(result.errors).toBeUndefined();
    expect(result.data).toBeDefined();
    expect(result.data?.__schema).toBeDefined();

    const schema = result.data?.__schema as {
      queryType: { name: string };
      types: Array<{ name: string }>;
    };
    expect(schema.queryType.name).toBe("Query");
    expect(schema.types.length).toBeGreaterThan(0);

    // Should include our User type
    const typeNames = schema.types.map((t) => t.name);
    expect(typeNames).toContain("User");
    expect(typeNames).toContain("Query");
  });
});
