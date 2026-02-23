/**
 * GraphQL Queries for User
 *
 * Apollo Client gql-tagged queries for user-related operations.
 * Used in Apollo Client integration tests.
 */

import { gql } from "@apollo/client"

export const ME_QUERY = gql`
    query Me {
        me {
            id
            email
            displayName
        }
    }
`
