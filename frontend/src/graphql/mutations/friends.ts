import { gql } from "@apollo/client"

import { FRIEND_REQUEST_FIELDS, FRIENDSHIP_FIELDS } from "@/graphql/fragments/friends"

export const SEND_FRIEND_REQUEST = gql`
    mutation SendFriendRequest($userId: ID!) {
        sendFriendRequest(userId: $userId) {
            ...FriendRequestFields
        }
    }
    ${FRIEND_REQUEST_FIELDS}
`

export const ACCEPT_FRIEND_REQUEST = gql`
    mutation AcceptFriendRequest($requestId: ID!) {
        acceptFriendRequest(requestId: $requestId) {
            ...FriendshipFields
        }
    }
    ${FRIENDSHIP_FIELDS}
`

export const REJECT_FRIEND_REQUEST = gql`
    mutation RejectFriendRequest($requestId: ID!) {
        rejectFriendRequest(requestId: $requestId)
    }
`

export const CANCEL_FRIEND_REQUEST = gql`
    mutation CancelFriendRequest($requestId: ID!) {
        cancelFriendRequest(requestId: $requestId)
    }
`
