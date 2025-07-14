// src/query/playersquery.js

import { gql } from 'graphql-request';

export const playersQuery = gql`
query MyQuery {
  players {
    coins
    color
    name
    id
    games {
      id
    }
    traders {
      id
      isActive
      products {
        id
        name
        quantity
        sector {
          id
          name
        }
      }
      player {
        id
        traders {
          id
          sector {
            id
            name
          }
        }
      }
    }
  }
  games {
    players {
      id
      coins
      color
      name
      traders {
        sector {
          id
          traders {
            id
            sector {
              id
            }
          }
        }
        id
        isActive
      }
    }
    id
    sectors {
      id
      name
      traders {
        id
        sector {
          id
        }
      }
    }
  }
  sectors {
    description
    name
    id
    traders {
      id
      isActive
      sector {
        id
        name
      }
    }
  }
  traders {
    id
    isActive
  }
  eventCards {
    id
    name
  }
}
`;
