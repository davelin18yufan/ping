import { gql } from "@apollo/client"

import { USER_BASIC_FIELDS, FRIEND_REQUEST_FIELDS } from "@/graphql/fragments/friends"

export const SEARCH_USERS = gql`
    query SearchUsers($query: String!) {
        searchUsers(query: $query) {
            ...UserBasicFields
        }
    }
    ${USER_BASIC_FIELDS}
`

export const GET_FRIENDS = gql`
    query Friends {
        friends {
            ...UserBasicFields
        }
    }
    ${USER_BASIC_FIELDS}
`

export const GET_PENDING_REQUESTS = gql`
    query PendingFriendRequests {
        pendingFriendRequests {
            ...FriendRequestFields
        }
    }
    ${FRIEND_REQUEST_FIELDS}
`

export const GET_SENT_REQUESTS = gql`
    query SentFriendRequests {
        sentFriendRequests {
            ...FriendRequestFields
        }
    }
    ${FRIEND_REQUEST_FIELDS}
`
