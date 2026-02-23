/**
 * GraphQL Fragments for Friends Feature
 *
 * Plain template string fragments (no gql tag needed).
 * Consumed via string interpolation in operations.
 */

export const USER_BASIC_FIELDS = `
    fragment UserBasicFields on User {
        id
        name
        email
        image
    }
`

export const FRIEND_REQUEST_FIELDS = `
    fragment FriendRequestFields on FriendRequest {
        id
        status
        createdAt
        updatedAt
        sender {
            ...UserBasicFields
        }
        receiver {
            ...UserBasicFields
        }
    }
    ${USER_BASIC_FIELDS}
`

export const FRIENDSHIP_FIELDS = `
    fragment FriendshipFields on Friendship {
        id
        friend {
            ...UserBasicFields
        }
        since
    }
    ${USER_BASIC_FIELDS}
`
