/**
 * GraphQL queries for Mobile app
 * Shared between Web and Mobile where possible
 */

import { gql } from "@apollo/client"

/**
 * Query to get current authenticated user
 * Used for session validation and user profile
 */
export const GET_ME = gql`
    query GetMe {
        me {
            id
            email
            displayName
            avatarUrl
        }
    }
`

/**
 * Query to get user by ID
 */
export const GET_USER = gql`
    query GetUser($id: ID!) {
        user(id: $id) {
            id
            email
            displayName
            avatarUrl
        }
    }
`

/**
 * Query to search users
 */
export const SEARCH_USERS = gql`
    query SearchUsers($query: String!, $limit: Int = 20) {
        searchUsers(query: $query, limit: $limit) {
            id
            email
            displayName
            avatarUrl
        }
    }
`
