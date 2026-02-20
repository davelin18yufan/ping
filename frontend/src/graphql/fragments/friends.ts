import { gql } from "@apollo/client"

export const USER_BASIC_FIELDS = gql`
    fragment UserBasicFields on User {
        id
        name
        email
        image
    }
`

export const FRIEND_REQUEST_FIELDS = gql`
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

export const FRIENDSHIP_FIELDS = gql`
    fragment FriendshipFields on Friendship {
        id
        friend {
            ...UserBasicFields
        }
        since
    }
    ${USER_BASIC_FIELDS}
`
