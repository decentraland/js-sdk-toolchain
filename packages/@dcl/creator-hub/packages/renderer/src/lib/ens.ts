const BATCH_SIZE = 1000;

export type Domain = { name: string };
export type DomainsQueryResult = { data: { domains: Domain[] } } | { errors: any };

export type OwnerByENSTuple = {
  name: string;
  wrappedOwner: {
    id: string;
  };
};
export type OwnerByENSQueryResult =
  | {
      data: {
        domains: OwnerByENSTuple[];
      };
    }
  | { errors: any };

export class ENS {
  private subgraph = 'https://subgraph.decentraland.org/ens';
  constructor(isDev: boolean) {
    if (isDev) {
      this.subgraph = 'https://subgraph.decentraland.org/ens-sepolia';
    }
  }

  public async fetchNames(address: string) {
    const response: Response = await fetch(this.subgraph, {
      method: 'POST',
      body: JSON.stringify({
        query: `{
          domains(
            where: {or: [
              { wrappedOwner: "${address.toLowerCase()}" },
              { registrant: "${address.toLowerCase()}" }
            ]}
          ) {
            name
          }
        }`,
      }),
    });

    if (!response.ok) {
      throw new Error(response.status.toString());
    }

    const queryResult: DomainsQueryResult = await response.json();

    if ('errors' in queryResult) {
      throw new Error(JSON.stringify(queryResult.errors));
    }

    return queryResult.data.domains.map(domain => domain.name);
  }

  public async fetchNamesOwners(domains: string[]): Promise<Record<string, string>> {
    if (!domains) {
      return {};
    }

    const response: Response = await fetch(this.subgraph, {
      method: 'POST',
      body: JSON.stringify({
        query: `query getOwners($domains: [String]) {
          domains(where: { name_in: $domains }) {
            name
            wrappedOwner {
              id
            }
          }
        }`,
        variables: { domains },
      }),
    });

    if (!response.ok) {
      throw new Error(response.status.toString());
    }

    const queryResult: OwnerByENSQueryResult = await response.json();

    if ('errors' in queryResult) {
      throw new Error(JSON.stringify(queryResult.errors));
    }

    const results: Record<string, string> = {};
    queryResult.data.domains.forEach(({ wrappedOwner, name }) => {
      if (wrappedOwner && wrappedOwner.id) {
        results[name] = wrappedOwner.id;
      }
    });
    return results;
  }
}

export type DCLDomainsQueryResult =
  | { data: { nfts: { ens: { subdomain: string } }[] } }
  | { errors: any };

export type DCLOwnerByNameTuple = {
  owner: {
    address: string;
  };
  ens: {
    subdomain: string;
  };
};
export type DCLOwnerByNameQueryResult = {
  data: {
    nfts: DCLOwnerByNameTuple[];
  };
};

export class DCLNames {
  private subgraph = 'https://subgraph.decentraland.org/marketplace';
  constructor(isDev: boolean) {
    if (isDev) {
      this.subgraph = 'https://subgraph.decentraland.org/marketplace-sepolia';
    }
  }

  public async fetchNames(address: string) {
    let results: string[] = [];
    let offset = 0;
    let nextPage = true;

    while (nextPage) {
      const response: Response = await fetch(this.subgraph, {
        method: 'POST',
        body: JSON.stringify({
          query: `{
            nfts(
              first: ${BATCH_SIZE},
              skip: ${offset},
              where: {
                owner_: { id: "${address.toLowerCase()}" },
                category: ens
              }
            ) {
              ens {
                subdomain
              }
            }
          }`,
        }),
      });

      if (!response.ok) {
        throw new Error(response.status.toString());
      }

      const queryResult: DCLDomainsQueryResult = await response.json();

      if ('errors' in queryResult) {
        throw new Error(JSON.stringify(queryResult.errors));
      }
      const domains: string[] = queryResult.data.nfts.map(
        nft => `${nft.ens.subdomain.toString()}.dcl.eth`,
      );
      results = results.concat(domains);

      if (domains.length === BATCH_SIZE) {
        offset += BATCH_SIZE;
      } else {
        nextPage = false;
      }
    }

    return results;
  }

  public async fetchNamesOwners(domains: string[]) {
    if (!domains) {
      return {};
    }

    const results: Record<string, string> = {};
    let offset = 0;
    let nextPage = true;

    while (nextPage) {
      const response: Response = await fetch(this.subgraph, {
        method: 'POST',
        body: JSON.stringify({
          query: `query getOwners($domains: [String!], $offset: Int) {
            nfts(first: ${BATCH_SIZE}, skip: $offset, where: { name_in: $domains, category: ens }) {
              owner {
                address
              }
              ens {
                subdomain
              }
            }
          }`,
          variables: { domains, offset },
        }),
      });

      if (!response.ok) {
        throw new Error(response.status.toString());
      }

      const queryResult: DCLOwnerByNameQueryResult = await response.json();

      if ('errors' in queryResult) {
        throw new Error(JSON.stringify(queryResult.errors));
      }
      queryResult.data.nfts.forEach(({ ens, owner }) => {
        results[ens.subdomain] = owner.address;
      });

      if (queryResult.data.nfts.length === BATCH_SIZE) {
        offset += BATCH_SIZE;
      } else {
        nextPage = false;
      }
    }

    return results;
  }
}
