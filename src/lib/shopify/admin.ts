const SHOPIFY_ADMIN_API_VERSION = "2026-04";

export type ShopifyGraphqlUserError = {
  field?: string[] | null;
  message: string;
};

export type ShopifyGraphqlResponse<TData> = {
  data?: TData;
  errors?: { message: string }[];
};

export function normalizeShopDomain(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  const withoutProtocol = trimmed.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const domain = withoutProtocol.split("/")[0];

  if (!domain) return null;
  if (domain.includes(".")) return domain;
  return `${domain}.myshopify.com`;
}

export async function shopifyAdminGraphql<TData>(input: {
  shopDomain: string;
  accessToken: string;
  query: string;
  variables?: Record<string, unknown>;
}) {
  const shopDomain = normalizeShopDomain(input.shopDomain);
  const accessToken = input.accessToken.trim();

  if (!shopDomain) {
    throw new Error("Shopify shop domain is required.");
  }

  if (!accessToken) {
    throw new Error("Shopify Admin API access token is required.");
  }

  const response = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_ADMIN_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: input.query,
        variables: input.variables ?? {},
      }),
    }
  );

  const payload = (await response.json().catch(() => null)) as ShopifyGraphqlResponse<TData> | null;

  if (!response.ok) {
    throw new Error(`Shopify Admin API request failed with status ${response.status}.`);
  }

  if (!payload) {
    throw new Error("Shopify Admin API returned an invalid response.");
  }

  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  return payload.data as TData;
}

export type CreateBasicDiscountCodeInput = {
  shopDomain: string;
  accessToken: string;
  code: string;
  title: string;
  percentage: number;
  startsAt: string | Date;
};

export type CreateBasicDiscountCodeResult = {
  discount: {
    id: string;
    title: string;
    codes: { code: string }[];
  } | null;
  userErrors: ShopifyGraphqlUserError[];
};

const CREATE_BASIC_DISCOUNT_CODE_MUTATION = `#graphql
  mutation CreateBasicDiscountCode($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode {
        id
        codeDiscount {
          ... on DiscountCodeBasic {
            title
            codes(first: 10) {
              nodes {
                code
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export async function createBasicDiscountCode(
  input: CreateBasicDiscountCodeInput
): Promise<CreateBasicDiscountCodeResult> {
  const data = await shopifyAdminGraphql<{
    discountCodeBasicCreate: {
      codeDiscountNode: {
        id: string;
        codeDiscount: {
          title: string;
          codes: { nodes: { code: string }[] };
        } | null;
      } | null;
      userErrors: ShopifyGraphqlUserError[];
    };
  }>({
    shopDomain: input.shopDomain,
    accessToken: input.accessToken,
    query: CREATE_BASIC_DISCOUNT_CODE_MUTATION,
    variables: {
      basicCodeDiscount: {
        title: input.title,
        code: input.code.trim().toUpperCase(),
        startsAt:
          input.startsAt instanceof Date
            ? input.startsAt.toISOString()
            : input.startsAt,
        context: {
          all: true,
        },
        customerGets: {
          value: {
            percentage: input.percentage / 100,
          },
          items: {
            all: true,
          },
        },
      },
    },
  });

  const result = data.discountCodeBasicCreate;
  const discountNode = result.codeDiscountNode;

  return {
    discount: discountNode?.codeDiscount
      ? {
          id: discountNode.id,
          title: discountNode.codeDiscount.title,
          codes: discountNode.codeDiscount.codes.nodes,
        }
      : null,
    userErrors: result.userErrors,
  };
}
